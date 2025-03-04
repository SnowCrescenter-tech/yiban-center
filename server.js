const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const XLSX = require('xlsx');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 设置文件上传
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/';
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
  fileFilter: function(req, file, cb) {
    // 只接受Excel文件
    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      return cb(new Error('只允许上传Excel文件!'), false);
    }
    cb(null, true);
  }
});

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

// 检查角色权限中间件 - 支持多个角色
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: '未授权' });
    
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({ message: '权限不足' });
  };
};

// 检查是否是部门负责人或更高权限
const isDepartmentHeadOrAbove = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: '未授权' });
  
  if (['super_admin', 'admin', 'department_head'].includes(req.user.role)) {
    return next();
  }
  
  return res.status(403).json({ message: '权限不足，需要部门负责人或更高权限' });
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
    
    // 实际应用中应该使用 bcrypt.compare
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        department: user.department 
      },
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
        department: user.department,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 批量导入用户API路由
app.post('/api/users/batch-import', authenticateToken, checkRole(['super_admin', 'admin']), upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传Excel文件' });
    }
    
    // 读取Excel文件
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // 导入结果统计
    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    // 处理每一行数据
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // 检查必填字段
      if (!row.username || !row.password || !row.name) {
        results.failed++;
        results.errors.push(`第${i+2}行: 用户名、密码和姓名为必填项`);
        continue;
      }
      
      try {
        // 检查用户名是否已存在
        const [existingUsers] = await pool.execute('SELECT id FROM users WHERE username = ?', [row.username]);
        if (existingUsers.length > 0) {
          results.failed++;
          results.errors.push(`第${i+2}行: 用户名"${row.username}"已存在`);
          continue;
        }
        
        // 确定角色值
        const role = row.role && ['super_admin', 'admin', 'department_head', 'member'].includes(row.role) 
          ? row.role 
          : 'member';
        
        // 对密码进行哈希处理
        const hashedPassword = await bcrypt.hash(row.password, 10);
        
        // 插入用户
        await pool.execute(
          'INSERT INTO users (username, password, name, department, role) VALUES (?, ?, ?, ?, ?)',
          [row.username, hashedPassword, row.name, row.department || null, role]
        );
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`第${i+2}行: ${error.message}`);
      }
    }
    
    // 删除临时文件
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('删除临时文件失败:', err);
    });
    
    res.json(results);
  } catch (error) {
    console.error('批量导入用户错误:', error);
    
    // 确保临时文件被删除
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取用户列表
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // 管理员可以看所有用户详细信息，部门负责人只能看自己部门的详细信息，普通成员只能看公开信息
    let query, params = [];
    
    if (['super_admin', 'admin'].includes(req.user.role)) {
      // 超级管理员和管理员可以看所有用户的详细信息
      query = 'SELECT id, username, name, role, department, avatar, created_at FROM users';
    } else if (req.user.role === 'department_head') {
      // 部门负责人可以看自己部门用户的详细信息
      query = 'SELECT id, username, name, role, department, avatar, created_at FROM users WHERE department = ?';
      params.push(req.user.department);
    } else {
      // 普通成员只能看公开信息
      query = 'SELECT id, name, role, department, avatar FROM users';
    }
    
    const [rows] = await pool.execute(query, params);
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

// 创建任务 - 增强版，支持部门任务和多成员
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, assigned_to, department, is_department_task, priority, due_date, members } = req.body;
    const created_by = req.user.id;
    
    // 检查权限 - 只有部门负责人及以上可创建部门任务
    if (is_department_task && !['super_admin', 'admin', 'department_head'].includes(req.user.role)) {
      return res.status(403).json({ message: '只有部门负责人及以上角色可以创建部门任务' });
    }
    
    // 如果是部门任务，但没指定部门，则使用负责人的部门
    let taskDepartment = department;
    if (is_department_task && !department && req.user.department) {
      taskDepartment = req.user.department;
    }
    
    // 如果是部门负责人，只能为自己的部门创建部门任务
    if (is_department_task && req.user.role === 'department_head' && taskDepartment !== req.user.department) {
      return res.status(403).json({ message: '部门负责人只能为自己的部门创建任务' });
    }
    
    if (!title) {
      return res.status(400).json({ message: '任务标题为必填项' });
    }
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 插入任务
      const [result] = await connection.execute(
        'INSERT INTO tasks (title, description, created_by, assigned_to, department, is_department_task, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [title, description, created_by, assigned_to || null, taskDepartment || null, is_department_task ? 1 : 0, priority || 'medium', due_date || null]
      );
      
      const taskId = result.insertId;
      
      // 如果提供了成员列表，添加关联
      if (members && Array.isArray(members) && members.length > 0) {
        for (const userId of members) {
          await connection.execute(
            'INSERT INTO task_members (task_id, user_id) VALUES (?, ?)',
            [taskId, userId]
          );
        }
      }
      
      // 如果是部门任务，添加通知
      if (is_department_task && taskDepartment) {
        await connection.execute(
          'INSERT INTO notifications (title, content, type, reference_id, is_public) VALUES (?, ?, ?, ?, ?)',
          [`新部门任务创建: ${title}`, `${taskDepartment}部门有新任务分配：${title}`, 'task', taskId, true]
        );
      }
      
      // 提交事务
      await connection.commit();
      
      // 获取完整任务信息
      const [taskRows] = await pool.execute(
        `SELECT t.*, u1.name as creator_name, u2.name as assignee_name 
         FROM tasks t
         LEFT JOIN users u1 ON t.created_by = u1.id
         LEFT JOIN users u2 ON t.assigned_to = u2.id
         WHERE t.id = ?`,
        [taskId]
      );
      
      // 获取任务成员
      const [memberRows] = await pool.execute(
        `SELECT u.id, u.name, u.department, u.avatar
         FROM task_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.task_id = ?`,
        [taskId]
      );
      
      // 组合数据
      const taskData = taskRows[0];
      taskData.members = memberRows;
      
      res.status(201).json(taskData);
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('创建任务错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取任务列表 - 增强版，包含任务成员
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    // 根据用户角色和部门过滤任务
    let query = `
      SELECT t.*, u1.name as creator_name, u2.name as assignee_name 
      FROM tasks t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
    `;
    
    let params = [];
    let whereClause = "";
    
    // 非管理员只能看到自己的和自己部门的任务
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      whereClause = `WHERE (t.created_by = ? OR t.assigned_to = ? OR 
                    (t.is_department_task = TRUE AND t.department = ?) OR 
                    t.id IN (SELECT task_id FROM task_members WHERE user_id = ?))`;
      params = [req.user.id, req.user.id, req.user.department, req.user.id];
    }
    
    if (whereClause) {
      query += " " + whereClause;
    }
    
    query += " ORDER BY t.created_at DESC";
    
    const [rows] = await pool.execute(query, params);
    
    // 获取每个任务的成员
    const tasksWithMembers = [];
    for (const task of rows) {
      const [memberRows] = await pool.execute(
        `SELECT u.id, u.name, u.department, u.avatar
         FROM task_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.task_id = ?`,
        [task.id]
      );
      
      task.members = memberRows;
      tasksWithMembers.push(task);
    }
    
    res.json(tasksWithMembers);
  } catch (error) {
    console.error('获取任务错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取任务详情
app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    
    // 获取任务详情
    const [taskRows] = await pool.execute(
      `SELECT t.*, u1.name as creator_name, u2.name as assignee_name 
       FROM tasks t
       LEFT JOIN users u1 ON t.created_by = u1.id
       LEFT JOIN users u2 ON t.assigned_to = u2.id
       WHERE t.id = ?`,
      [taskId]
    );
    
    if (taskRows.length === 0) {
      return res.status(404).json({ message: '任务不存在' });
    }
    
    // 检查权限 - 非管理员只能看自己的或部门的任务
    const task = taskRows[0];
    if (!['super_admin', 'admin'].includes(req.user.role) && 
        task.created_by !== req.user.id && 
        task.assigned_to !== req.user.id && 
        !(task.is_department_task && task.department === req.user.department)) {
      
      // 检查是否是任务成员
      const [memberCheck] = await pool.execute(
        'SELECT id FROM task_members WHERE task_id = ? AND user_id = ?',
        [taskId, req.user.id]
      );
      
      if (memberCheck.length === 0) {
        return res.status(403).json({ message: '您没有权限查看此任务' });
      }
    }
    
    // 获取任务成员
    const [memberRows] = await pool.execute(
      `SELECT u.id, u.name, u.department, u.avatar
       FROM task_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.task_id = ?`,
      [taskId]
    );
    
    // 组合数据
    task.members = memberRows;
    
    res.json(task);
  } catch (error) {
    console.error('获取任务详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新任务
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, assigned_to, department, is_department_task, priority, status, due_date, members } = req.body;
    
    // 检查任务是否存在
    const [taskRows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (taskRows.length === 0) {
      return res.status(404).json({ message: '任务不存在' });
    }
    
    const task = taskRows[0];
    
    // 检查权限
    // 只有创建者、管理员或部门负责人可以更新任务
    if (task.created_by !== req.user.id && 
        !['super_admin', 'admin'].includes(req.user.role) &&
        !(req.user.role === 'department_head' && task.department === req.user.department)) {
      return res.status(403).json({ message: '您没有权限更新此任务' });
    }
    
    // 部门负责人只能更新自己部门的任务
    if (req.user.role === 'department_head' && 
        task.department !== req.user.department &&
        department !== req.user.department) {
      return res.status(403).json({ message: '部门负责人只能更新自己部门的任务' });
    }
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 更新任务
      await connection.execute(
        `UPDATE tasks 
         SET title = IFNULL(?, title), 
             description = IFNULL(?, description), 
             assigned_to = ?, 
             department = ?, 
             is_department_task = ?, 
             priority = IFNULL(?, priority), 
             status = IFNULL(?, status), 
             due_date = ?
         WHERE id = ?`,
        [
          title, 
          description, 
          assigned_to || null, 
          department || task.department, 
          is_department_task !== undefined ? (is_department_task ? 1 : 0) : task.is_department_task,
          priority,
          status,
          due_date || null,
          taskId
        ]
      );
      
      // 如果提供了成员列表，更新成员
      if (members && Array.isArray(members)) {
        // 删除现有成员关联
        await connection.execute('DELETE FROM task_members WHERE task_id = ?', [taskId]);
        
        // 添加新成员关联
        for (const userId of members) {
          await connection.execute(
            'INSERT INTO task_members (task_id, user_id) VALUES (?, ?)',
            [taskId, userId]
          );
        }
      }
      
      // 提交事务
      await connection.commit();
      
      // 获取更新后的任务详情
      const [updatedTaskRows] = await pool.execute(
        `SELECT t.*, u1.name as creator_name, u2.name as assignee_name 
         FROM tasks t
         LEFT JOIN users u1 ON t.created_by = u1.id
         LEFT JOIN users u2 ON t.assigned_to = u2.id
         WHERE t.id = ?`,
        [taskId]
      );
      
      // 获取任务成员
      const [memberRows] = await pool.execute(
        `SELECT u.id, u.name, u.department, u.avatar
         FROM task_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.task_id = ?`,
        [taskId]
      );
      
      // 组合数据
      const updatedTask = updatedTaskRows[0];
      updatedTask.members = memberRows;
      
      res.json(updatedTask);
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('更新任务错误:', error);
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
    const { title, description, assigned_to, department, is_department_task, priority, due_date, members } = req.body;
    const created_by = req.user.id;
    
    // 检查权限 - 只有部门负责人及以上可创建部门任务
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
    
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ message: '日程标题、开始时间和结束时间为必填项' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO schedules (title, description, start_time, end_time, location, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, start_time, end_time, location || '', created_by]
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

// 标记通知为已读
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    // 检查通知是否存在
    const [notifications] = await pool.execute('SELECT * FROM notifications WHERE id = ?', [notificationId]);
    if (notifications.length === 0) {
      return res.status(404).json({ message: '通知不存在' });
    }
    
    // 更新通知为已读状态
    await pool.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [notificationId]);
    
    res.json({ message: '通知已标记为已读' });
  } catch (error) {
    console.error('标记通知已读错误:', error);
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

// 处理未找到路由的情况 - 通配符路由应该使用app.all而不是app.use
// 修改：将app.use改为app.all，这样可以更准确地捕获所有HTTP方法的请求
app.all('*', (req, res) => {
  res.redirect('/');
});
