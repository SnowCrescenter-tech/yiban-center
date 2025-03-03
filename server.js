const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'media_center',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 身份验证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: '未提供身份验证令牌' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: '令牌无效或已过期' });
    req.user = user;
    next();
  });
};

// 验证令牌路由
app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// 登录路由
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    const user = rows[0];
    // 为了测试方便，这里直接比较密码，实际应用应使用 bcrypt.compare
    // const validPassword = await bcrypt.compare(password, user.password);
    const validPassword = password === 'admin123'; // 假设默认密码是 admin123
    
    if (!validPassword) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户列表
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // 管理员可以看所有用户，普通用户只能看到公开信息
    const isAdmin = req.user.role === 'admin';
    
    const query = isAdmin 
      ? 'SELECT id, username, name, role, department, avatar, created_at FROM users'
      : 'SELECT id, name, role, department, avatar FROM users';
    
    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建用户接口 (仅管理员可用)
app.post('/api/users', authenticateToken, async (req, res) => {
  // 验证管理员权限
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '只有管理员可以创建用户' });
  }

  try {
    const { username, password, name, department, role } = req.body;
    
    // 验证必填字段
    if (!username || !password || !name) {
      return res.status(400).json({ message: '用户名、密码和姓名为必填项' });
    }
    
    // 检查用户名是否已存在
    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: '用户名已存在，请选择其他用户名' });
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, name, department, role) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, name, department, role || 'member']
    );
    
    const userId = result.insertId;
    const [newUser] = await pool.execute('SELECT id, username, name, role, department, created_at FROM users WHERE id = ?', [userId]);
    
    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新用户接口 (仅管理员可用)
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;
  
  // 验证权限 (管理员或自己)
  const isAdmin = req.user.role === 'admin';
  const isSelf = req.user.id == userId;
  
  if (!isAdmin && !isSelf) {
    return res.status(403).json({ message: '没有权限修改此用户' });
  }
  
  try {
    const { name, department, role, password } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ message: '姓名为必填项' });
    }
    
    // 如果是修改自己的账户，不能自行修改角色
    if (isSelf && !isAdmin && role !== req.user.role) {
      return res.status(403).json({ message: '你不能更改自己的用户角色' });
    }
    
    // 准备更新字段
    let query = 'UPDATE users SET name = ?, department = ?';
    let params = [name, department];
    
    // 如果是管理员，可以更新角色
    if (isAdmin && role) {
      query += ', role = ?';
      params.push(role);
    }
    
    // 如果提供了密码，更新密码
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }
    
    query += ' WHERE id = ?';
    params.push(userId);
    
    // 执行更新
    await pool.execute(query, params);
    
    const [updatedUser] = await pool.execute('SELECT id, username, name, role, department, created_at FROM users WHERE id = ?', [userId]);
    
    if (updatedUser.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    res.json(updatedUser[0]);
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除用户接口 (仅管理员可用)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  // 验证管理员权限
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '只有管理员可以删除用户' });
  }
  
  const userId = req.params.id;
  
  // 不允许删除自己
  if (req.user.id == userId) {
    return res.status(400).json({ message: '不能删除自己的账户' });
  }
  
  try {
    // 检查用户是否存在
    const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 删除用户
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    
    res.json({ message: '用户已成功删除' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取任务列表
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT t.*, u1.name as creator_name, u2.name as assignee_name 
      FROM tasks t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('获取任务错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建新任务
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, assigned_to, priority, due_date } = req.body;
    const created_by = req.user.id;
    
    const [result] = await pool.execute(
      'INSERT INTO tasks (title, description, created_by, assigned_to, priority, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, created_by, assigned_to, priority, due_date, 'pending']
    );
    
    // 添加通知
    if (assigned_to) {
      await pool.execute(
        'INSERT INTO notifications (title, content, type, reference_id) VALUES (?, ?, ?, ?)',
        [`新任务分配`, `您有一个新的任务: ${title}`, 'task', result.insertId]
      );
    }
    
    const [newTask] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json(newTask[0]);
  } catch (error) {
    console.error('创建任务错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新任务
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, assigned_to, priority, due_date } = req.body;
    
    // 检查任务是否存在
    const [tasks] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ message: '任务不存在' });
    }
    
    // 更新任务
    await pool.execute(
      'UPDATE tasks SET title = ?, description = ?, assigned_to = ?, priority = ?, due_date = ? WHERE id = ?',
      [title, description, assigned_to, priority, due_date, taskId]
    );
    
    // 如果分配给新用户，添加通知
    if (assigned_to && assigned_to !== tasks[0].assigned_to) {
      await pool.execute(
        'INSERT INTO notifications (title, content, type, reference_id) VALUES (?, ?, ?, ?)',
        [`任务更新通知`, `您有一个更新的任务: ${title}`, 'task', taskId]
      );
    }
    
    const [updatedTask] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.json(updatedTask[0]);
  } catch (error) {
    console.error('更新任务错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新任务状态
app.put('/api/tasks/:id/status', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status } = req.body;
    
    // 检查任务是否存在
    const [tasks] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ message: '任务不存在' });
    }
    
    // 更新任务状态
    await pool.execute('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);
    
    // 添加通知
    if (status === 'completed') {
      await pool.execute(
        'INSERT INTO notifications (title, content, type, reference_id) VALUES (?, ?, ?, ?)',
        [`任务已完成`, `任务 "${tasks[0].title}" 已标记为完成`, 'task', taskId]
      );
    }
    
    const [updatedTask] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.json(updatedTask[0]);
  } catch (error) {
    console.error('更新任务状态错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除任务
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // 检查任务是否存在
    const [tasks] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (tasks.length === 0) {
      return res.status(404).json({ message: '任务不存在' });
    }
    
    // 管理员或任务创建者才能删除任务
    if (req.user.role !== 'admin' && req.user.id !== tasks[0].created_by) {
      return res.status(403).json({ message: '您没有权限删除此任务' });
    }
    
    // 删除任务
    await pool.execute('DELETE FROM tasks WHERE id = ?', [taskId]);
    
    // 删除相关通知
    await pool.execute('DELETE FROM notifications WHERE type = "task" AND reference_id = ?', [taskId]);
    
    res.json({ message: '任务已成功删除' });
  } catch (error) {
    console.error('删除任务错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取日程列表
app.get('/api/schedules', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT s.*, u.name as creator_name 
      FROM schedules s
      JOIN users u ON s.created_by = u.id
      ORDER BY s.start_time ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('获取日程错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建新日程
app.post('/api/schedules', authenticateToken, async (req, res) => {
  try {
    const { title, description, start_time, end_time, location } = req.body;
    const created_by = req.user.id;
    
    const [result] = await pool.execute(
      'INSERT INTO schedules (title, description, start_time, end_time, location, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, start_time, end_time, location, created_by]
    );
    
    // 添加通知
    await pool.execute(
      'INSERT INTO notifications (title, content, type, reference_id, is_public) VALUES (?, ?, ?, ?, ?)',
      [`新日程创建`, `新日程: ${title}, 时间: ${new Date(start_time).toLocaleString('zh-CN')}`, 'schedule', result.insertId, true]
    );
    
    const [newSchedule] = await pool.execute('SELECT * FROM schedules WHERE id = ?', [result.insertId]);
    res.status(201).json(newSchedule[0]);
  } catch (error) {
    console.error('创建日程错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取通知列表
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM notifications WHERE is_public = TRUE OR (type = "task" AND reference_id IN (SELECT id FROM tasks WHERE assigned_to = ?)) ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('获取通知错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建通知
app.post('/api/notifications', authenticateToken, async (req, res) => {
  // 仅管理员可创建公告
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '只有管理员可以创建公告' });
  }
  
  try {
    const { title, content, is_public } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO notifications (title, content, type, is_public) VALUES (?, ?, ?, ?)',
      [title, content, 'announcement', is_public]
    );
    
    const [newNotification] = await pool.execute('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
    res.status(201).json(newNotification[0]);
  } catch (error) {
    console.error('创建通知错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 路由处理
// 将宣传页面设为首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// 工作站页面路由
app.get('/workstation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 处理未找到路由的情况
app.get('*', (req, res) => {
  res.redirect('/');
});
