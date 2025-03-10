// 全局变量
let currentUser = null;
let tasks = [];
let schedules = [];
let notifications = [];
let users = [];
let currentPage = 'login';
let currentWeek = new Date();
let darkMode = false;

// DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// 应用初始化
function initApp() {
  // 检查本地存储中的令牌
  const token = localStorage.getItem('token');
  
  // 应用保存的主题设置
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
  
  if (token) {
    // 尝试使用令牌自动登录
    autoLogin(token);
  } else {
    // 显示登录页面
    showPage('login');
  }

  // 添加事件监听器
  addEventListeners();
  
  // 初始化模态框
  initModals();
}

// 自动登录
async function autoLogin(token) {
  try {
    // 验证令牌
    const response = await fetch('/api/verify-token', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      updateUserInfo();
      showPage('dashboard');
      loadDashboardData();
    } else {
      // 令牌无效，清除并显示登录页面
      localStorage.removeItem('token');
      showPage('login');
    }
  } catch (error) {
    handleApiError(error, '自动登录失败');
    localStorage.removeItem('token');
    showPage('login');
  }
}

// 添加事件监听器
function addEventListeners() {
  // 登录表单提交
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  // 侧边栏菜单项点击
  document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      showPage(page);
      
      // 加载页面特定数据
      if (page === 'dashboard') {
        loadDashboardData();
      } else if (page === 'tasks') {
        loadTasksData();
      } else if (page === 'schedule') {
        loadScheduleData();
      } else if (page === 'notifications') {
        loadNotificationsData();
      } else if (page === 'users') {
        loadUsersData();
      }
    });
  });

  // 切换侧边栏
  document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);

  // 退出登录
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // 切换深色/浅色模式
  document.querySelector('.theme-switch').addEventListener('click', toggleDarkMode);

  // 任务操作按钮
  document.getElementById('add-task-btn').addEventListener('click', () => openModal('add-task-modal'));
  document.getElementById('add-task-btn-page').addEventListener('click', () => openModal('add-task-modal'));
  document.getElementById('save-task-btn').addEventListener('click', handleAddTask);

  // 日程操作按钮
  document.getElementById('add-schedule-btn').addEventListener('click', () => openModal('add-schedule-modal'));
  document.getElementById('add-schedule-btn-page').addEventListener('click', () => openModal('add-schedule-modal'));
  document.getElementById('save-schedule-btn').addEventListener('click', handleAddSchedule);

  // 日程导航按钮
  document.getElementById('prev-week').addEventListener('click', () => navigateWeek(-1));
  document.getElementById('next-week').addEventListener('click', () => navigateWeek(1));

  // 查看全部链接
  document.querySelectorAll('.view-all').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      showPage(page);

      // 加载页面特定数据
      if (page === 'tasks') {
        loadTasksData();
      } else if (page === 'schedule') {
        loadScheduleData();
      } else if (page === 'notifications') {
        loadNotificationsData();
      }
    });
  });

  // 任务筛选
  document.getElementById('task-status-filter')?.addEventListener('change', filterTasks);
  document.getElementById('task-priority-filter')?.addEventListener('change', filterTasks);

  // 用户管理
  document.getElementById('add-user-btn')?.addEventListener('click', () => openUserModal());
  document.getElementById('save-user-btn')?.addEventListener('click', handleSaveUser);
  
  // 用户筛选
  document.getElementById('user-role-filter')?.addEventListener('change', filterUsers);
  document.getElementById('user-department-filter')?.addEventListener('change', filterUsers);
  
  // 头像预览
  const avatarInput = document.getElementById('avatar-input');
  if (avatarInput) {
    avatarInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('avatar-preview').src = e.target.result;
        };
        reader.readAsDataURL(this.files[0]);
      }
    });
  }

  // 公告相关按钮
  document.getElementById('add-notification-btn')?.addEventListener('click', () => openModal('add-notification-modal'));
  document.getElementById('save-notification-btn')?.addEventListener('click', handleAddNotification);
  document.getElementById('notification-type-filter')?.addEventListener('change', filterNotifications);

  // 通知铃铛点击事件
  document.getElementById('notification-bell')?.addEventListener('click', toggleNotificationDropdown);
  
  // 关闭通知下拉菜单按钮
  document.querySelector('.close-notification')?.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleNotificationDropdown();
  });
  
  // 点击其他区域关闭通知下拉菜单
  document.addEventListener('click', function(e) {
    const notificationBell = document.getElementById('notification-bell');
    const notificationDropdown = document.getElementById('notification-dropdown');
    
    if (notificationDropdown && notificationDropdown.classList.contains('show') && 
        !notificationBell.contains(e.target)) {
      toggleNotificationDropdown();
    }
  });
  
  // "查看全部通知"链接
  document.querySelector('.notification-dropdown-footer .view-all-link')?.addEventListener('click', function(e) {
    e.preventDefault();
    const page = this.getAttribute('data-page');
    showPage(page);
    // 关闭通知下拉菜单
    document.getElementById('notification-dropdown').classList.remove('show');
    // 加载通知数据
    loadNotificationsData();
  });

  // 设置页面相关按钮
  document.getElementById('save-personal-settings-btn')?.addEventListener('click', savePersonalSettings);
  document.getElementById('save-system-settings-btn')?.addEventListener('click', saveSystemSettings);

  // 主题设置选项
  document.getElementById('theme-light')?.addEventListener('change', function() {
    if (this.checked) setTheme('light');
  });
  
  document.getElementById('theme-dark')?.addEventListener('change', function() {
    if (this.checked) setTheme('dark');
  });
  
  document.getElementById('theme-auto')?.addEventListener('change', function() {
    if (this.checked) setTheme('auto');
  });
}

// 初始化Bootstrap模态框
function initModals() {
  // 在任务模态框显示前，加载用户列表
  const taskModal = document.getElementById('add-task-modal');
  if (taskModal) {
    taskModal.addEventListener('show.bs.modal', function () {
      loadUsersForTaskAssignment();
      // 如果是添加新任务，重置表单和标题
      if (!document.getElementById('add-task-form').dataset.editing) {
        document.getElementById('add-task-form').reset();
        document.querySelector('#add-task-modal .modal-title').textContent = '添加新任务';
      }
    });
  }
}

// 用户登录处理
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('remember-me').checked;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok) {
      // 登录成功
      currentUser = data.user;
      
      // 保存令牌到本地存储
      if (rememberMe) {
        localStorage.setItem('token', data.token);
      } else {
        sessionStorage.setItem('token', data.token);
      }
      updateUserInfo();
      showPage('dashboard');
      loadDashboardData();
    } else {
      // 登录失败
      alert(data.message || '登录失败，请检查用户名和密码');
    }
  } catch (error) {
    handleApiError(error, '登录过程中发生错误，请稍后再试');
  }
}

// 退出登录处理
function handleLogout() {
  // 清除令牌和用户信息
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  currentUser = null;
  
  // 显示登录页面
  showPage('login');
}

// 更新用户信息显示
function updateUserInfo() {
  if (currentUser) {
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-role').textContent = currentUser.role === 'admin' ? '管理员' : '成员';
    
    if (currentUser.avatar) {
      document.getElementById('user-avatar').src = `img/avatars/${currentUser.avatar}`;
    }
    
    // 显示或隐藏管理员功能
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = currentUser.role === 'admin' ? '' : 'none';
    });
  }
}

// 显示指定页面
function showPage(pageName) {
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(page => {
    page.classList.add('d-none');
  });
  
  // 显示请求的页面
  const pageElement = document.getElementById(`${pageName}-page`);
  if (pageElement) {
    pageElement.classList.remove('d-none');
    currentPage = pageName;
    
    // 更新侧边栏活动项
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-page') === pageName) {
        item.classList.add('active');
      }
    });

    // 特殊页面处理
    if (pageName === 'login') {
      // 添加登录页面专用样式
      document.body.classList.add('login-layout');
      // 确保侧边栏隐藏，主内容区域扩展到全宽
      document.querySelector('.sidebar').style.display = 'none';
      document.querySelector('.main-content').classList.add('full-width');
      // 确保返回按钮可见
      const backButton = document.querySelector('.login-container .back-button');
      if (backButton) {
        backButton.style.display = 'flex';
      }
    } else {
      document.body.classList.remove('login-layout');
      document.querySelector('.sidebar').style.display = 'flex';
      document.querySelector('.main-content').classList.remove('full-width');
    }
    
    // 针对用户页面的额外处理
    if (pageName === 'users') {
      loadUsersData();
    }
    
    // 针对设置页面的额外处理
    if (pageName === 'settings') {
      loadSettingsData();
    }
  }
}

// 加载仪表盘数据
async function loadDashboardData() {
  try {
    // 获取认证令牌
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    // 并行请求数据
    const [tasksResponse, schedulesResponse, notificationsResponse, usersResponse] = await Promise.all([
      fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('/api/schedules', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    // 解析响应数据
    tasks = await tasksResponse.json();
    schedules = await schedulesResponse.json();
    notifications = await notificationsResponse.json();
    users = await usersResponse.json();

    // 更新仪表盘统计数据
    updateDashboardStats();

    // 更新任务列表
    updateRecentTasks();

    // 更新通知列表
    updateNotifications();

    // 更新鱼骨图
    updateWeeklyFishbone();
    
    // 更新通知计数
    updateNotificationCount();

  } catch (error) {
    handleApiError(error, '加载仪表盘数据失败，请刷新页面重试');
  }
}

// 更新仪表盘统计数据
function updateDashboardStats() {
  // 进行中任务数量
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
  document.getElementById('task-count').textContent = inProgressTasks.length;

  // 已完成任务数量
  const completedTasks = tasks.filter(task => task.status === 'completed');
  document.getElementById('completed-task-count').textContent = completedTasks.length;

  // 今日日程数量
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySchedules = schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.start_time);
    return scheduleDate >= today && scheduleDate < tomorrow;
  });
  document.getElementById('today-schedule-count').textContent = todaySchedules.length;

  // 团队成员数量
  document.getElementById('member-count').textContent = users.length;
}

// 更新最近任务
function updateRecentTasks() {
  const recentTasksContainer = document.getElementById('recent-tasks');
  recentTasksContainer.innerHTML = '';

  // 显示最多5个最新任务
  const recentTasks = tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  if (recentTasks.length === 0) {
    recentTasksContainer.innerHTML = '<div class="no-data">暂无任务</div>';
    return;
  }

  recentTasks.forEach(task => {
    const taskElement = document.createElement('div');
    taskElement.className = `task-item priority-${task.priority}`;

    const assigneeName = task.assignee_name || '未指派';
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit',
      minute: '2-digit'
    }) : '无截止日期';

    taskElement.innerHTML = `
      <div class="task-checkbox">
        <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} data-task-id="${task.id}">
      </div>
      <div class="task-content">
        <div class="task-title">${task.title}</div>
        <div class="task-meta">
          <span><i class="fas fa-user"></i> ${assigneeName}</span>
          <span><i class="fas fa-calendar"></i> ${dueDate}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn" data-task-id="${task.id}" data-action="edit">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    `;

    // 添加任务完成状态切换事件
    const checkbox = taskElement.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => toggleTaskStatus(task.id, checkbox.checked));

    // 添加任务编辑事件
    const editButton = taskElement.querySelector('[data-action="edit"]');
    editButton.addEventListener('click', () => editTask(task.id));

    recentTasksContainer.appendChild(taskElement);
  });
}

// 更新通知列表
function updateNotifications() {
  const notificationListContainer = document.getElementById('notification-list');
  notificationListContainer.innerHTML = '';

  // 显示最多5个最新通知
  const recentNotifications = notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  if (recentNotifications.length === 0) {
    notificationListContainer.innerHTML = '<div class="no-data">暂无通知</div>';
    return;
  }

  recentNotifications.forEach(notification => {
    const notificationElement = document.createElement('div');
    notificationElement.className = 'notification-item';
    
    const notificationTime = new Date(notification.created_at).toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    notificationElement.innerHTML = `
      <div class="notification-header">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-time">${notificationTime}</div>
      </div>
      <div class="notification-content">${notification.content}</div>
    `;
    
    notificationListContainer.appendChild(notificationElement);
  });
}

// 更新周度鱼骨图
function updateWeeklyFishbone() {
  const fishboneContainer = document.getElementById('weekly-fishbone');
  fishboneContainer.innerHTML = '';

  // 创建鱼骨架
  const spine = document.createElement('div');
  spine.className = 'fishbone-spine';
  fishboneContainer.appendChild(spine);

  // 获取当前周的开始和结束日期
  const weekStart = getStartOfWeek(currentWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // 更新周标题
  const weekRange = `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;
  document.getElementById('current-week-range').textContent = weekRange;

  // 筛选当前周的日程
  const weekSchedules = schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.start_time);
    return scheduleDate >= weekStart && scheduleDate <= weekEnd;
  });

  // 创建每一天的日程显示
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);
    
    const dayElement = document.createElement('div');
    dayElement.className = 'fishbone-day';
    dayElement.style.left = `${i * 14}%`;
    
    // 日期标签
    const dayLabel = document.createElement('div');
    dayLabel.className = 'fishbone-day-label';
    const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayDate.getDay()];
    dayLabel.textContent = `${dayName} ${dayDate.getMonth() + 1}/${dayDate.getDate()}`;
    
    // 上半部分事件
    const eventsTop = document.createElement('div');
    eventsTop.className = 'fishbone-events-top';
    
    // 下半部分事件
    const eventsBottom = document.createElement('div');
    eventsBottom.className = 'fishbone-events-bottom';
    
    // 添加当天的日程
    const daySchedules = weekSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.start_time);
      return scheduleDate.getDate() === dayDate.getDate() && 
             scheduleDate.getMonth() === dayDate.getMonth() && 
             scheduleDate.getFullYear() === dayDate.getFullYear();
    });

    // 将日程分为上午和下午
    daySchedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.start_time);
      const hour = scheduleTime.getHours();
      
      const eventElement = document.createElement('div');
      let timeClass = '';
      if (hour < 12) {
        timeClass = 'fishbone-event-morning';
        eventsTop.appendChild(eventElement);
      } else if (hour < 18) {
        timeClass = 'fishbone-event-afternoon';
        eventsBottom.appendChild(eventElement);
      } else {
        timeClass = 'fishbone-event-evening';
        eventsBottom.appendChild(eventElement);
      }

      eventElement.className = `fishbone-event ${timeClass}`;
      eventElement.textContent = schedule.title;
      eventElement.setAttribute('data-schedule-id', schedule.id);
      
      // 添加点击事件查看详情
      eventElement.addEventListener('click', () => viewScheduleDetails(schedule.id));
    });

    dayElement.appendChild(eventsTop);
    dayElement.appendChild(dayLabel);
    dayElement.appendChild(eventsBottom);
    fishboneContainer.appendChild(dayElement);
  }
}

// 获取一周的开始日期（周日）
function getStartOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

// 切换周显示
function navigateWeek(direction) {
  const newDate = new Date(currentWeek);
  newDate.setDate(newDate.getDate() + direction * 7);
  currentWeek = newDate;
  updateWeeklyFishbone();
  
  // 如果在日程页面，也更新完整日程鱼骨图
  if (currentPage === 'schedule') {
    updateFullFishbone();
  }
}

// 加载任务数据
async function loadTasksData() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const response = await fetch('/api/tasks', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    tasks = await response.json();
    updateTasksTable();
  } catch (error) {
    handleApiError(error, '加载任务数据失败，请刷新页面重试');
  }
}

// 更新任务表格
function updateTasksTable() {
  const tableBody = document.getElementById('tasks-table-body');
  tableBody.innerHTML = '';

  // 获取筛选值
  const statusFilter = document.getElementById('task-status-filter').value;
  const priorityFilter = document.getElementById('task-priority-filter').value;

  // 应用筛选
  let filteredTasks = tasks;
  if (statusFilter !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
  }
  if (priorityFilter !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
  }

  if (filteredTasks.length === 0) {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `<td colspan="6" class="text-center">暂无任务数据</td>`;
    tableBody.appendChild(noDataRow);
    return;
  }

  filteredTasks.forEach(task => {
    const row = document.createElement('tr');
    
    const assigneeName = task.assignee_name || '未指派';
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    }) : '无截止日期';

    // 优先级标签
    let priorityBadge = '';
    if (task.priority === 'low') {
      priorityBadge = '<span class="badge bg-info">低</span>';
    } else if (task.priority === 'medium') {
      priorityBadge = '<span class="badge bg-warning">中</span>';
    } else if (task.priority === 'high') {
      priorityBadge = '<span class="badge bg-danger">高</span>';
    } else if (task.priority === 'urgent') {
      priorityBadge = '<span class="badge bg-danger bg-dark">紧急</span>';
    }

    // 状态标签
    let statusBadge = '';
    if (task.status === 'pending') {
      statusBadge = '<span class="badge bg-secondary">待处理</span>';
    } else if (task.status === 'in_progress') {
      statusBadge = '<span class="badge bg-primary">进行中</span>';
    } else if (task.status === 'completed') {
      statusBadge = '<span class="badge bg-success">已完成</span>';
    } else if (task.status === 'cancelled') {
      statusBadge = '<span class="badge bg-dark">已取消</span>';
    }

    row.innerHTML = `
      <td>${task.title}</td>
      <td>${assigneeName}</td>
      <td>${priorityBadge}</td>
      <td>${statusBadge}</td>
      <td>${dueDate}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn btn-outline-primary" data-action="edit" data-task-id="${task.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button type="button" class="btn btn-outline-danger" data-action="delete" data-task-id="${task.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    `;

    // 添加任务操作事件
    row.querySelector('[data-action="edit"]').addEventListener('click', () => editTask(task.id));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTask(task.id));

    tableBody.appendChild(row);
  });
}

// 筛选任务
function filterTasks() {
  updateTasksTable();
}

// 打开模态框
function openModal(modalId) {
  const modalElement = document.getElementById(modalId);
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

// 为任务分配加载用户列表
async function loadUsersForTaskAssignment() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    if (users.length === 0) {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      users = await response.json();
    }

    const selectElement = document.getElementById('task-assigned-to');
    selectElement.innerHTML = '<option value="">-- 选择用户 --</option>';
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = `${user.name} (${user.department || '无部门'})`;
      selectElement.appendChild(option);
    });
  } catch (error) {
    handleApiError(error, '加载用户列表失败');
  }
}

// 添加新任务
async function handleAddTask() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const assignedTo = document.getElementById('task-assigned-to').value;
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;

    if (!title) {
      alert('请输入任务标题');
      return;
    }

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        title,
        description,
        assigned_to: assignedTo || null,
        priority,
        due_date: dueDate || null
      })
    });

    if (response.ok) {
      // 关闭模态框
      const modalElement = document.getElementById('add-task-modal');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();

      // 重置表单数据
      document.getElementById('add-task-form').reset();
      document.getElementById('add-task-form').dataset.editing = '';

      // 重新加载数据
      if (currentPage === 'dashboard') {
        loadDashboardData();
      } else if (currentPage === 'tasks') {
        loadTasksData();
      }

      alert('任务创建成功');
    } else {
      const data = await response.json();
      alert(data.message || '创建任务失败');
    }
  } catch (error) {
    handleApiError(error, '创建任务过程中发生错误');
  }
}

// 编辑任务
function editTask(taskId) {
  // 找到对应的任务
  const task = tasks.find(t => t.id == taskId);
  if (!task) return;

  // 设置编辑模式标记
  document.getElementById('add-task-form').dataset.editing = 'true';

  // 填充表单
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-assigned-to').value = task.assigned_to || '';
  document.getElementById('task-priority').value = task.priority;
  if (task.due_date) {
    // 转换日期时间格式为 input datetime-local 接受的格式
    const dueDate = new Date(task.due_date);
    const formattedDate = dueDate.toISOString().slice(0, 16);
    document.getElementById('task-due-date').value = formattedDate;
  } else {
    document.getElementById('task-due-date').value = '';
  }

  // 修改保存按钮行为
  const saveButton = document.getElementById('save-task-btn');
  // 移除旧的事件监听器
  const newSaveButton = saveButton.cloneNode(true);
  saveButton.parentNode.replaceChild(newSaveButton, saveButton);
  // 添加新的事件监听器
  newSaveButton.addEventListener('click', () => updateTask(taskId));

  // 修改模态框标题
  document.querySelector('#add-task-modal .modal-title').textContent = '编辑任务';

  // 打开模态框
  openModal('add-task-modal');
}

// 更新任务
async function updateTask(taskId) {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const assignedTo = document.getElementById('task-assigned-to').value;
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;

    if (!title) {
      alert('请输入任务标题');
      return;
    }

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        description,
        assigned_to: assignedTo || null,
        priority,
        due_date: dueDate || null
      })
    });

    if (response.ok) {
      // 关闭模态框
      const modalElement = document.getElementById('add-task-modal');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();

      // 重置表单
      document.getElementById('add-task-form').reset();
      document.getElementById('add-task-form').dataset.editing = '';

      // 修改回模态框标题
      document.querySelector('#add-task-modal .modal-title').textContent = '添加任务';

      // 重新加载数据
      if (currentPage === 'dashboard') {
        loadDashboardData();
      } else if (currentPage === 'tasks') {
        loadTasksData();
      }

      alert('任务更新成功');
    } else {
      const data = await response.json();
      alert(data.message || '更新任务失败');
    }
  } catch (error) {
    handleApiError(error, '更新任务过程中发生错误');
  }
}

// 删除任务
async function deleteTask(taskId) {
  if (!confirm('确定要删除此任务吗？')) return;

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      // 重新加载数据
      if (currentPage === 'dashboard') {
        loadDashboardData();
      } else if (currentPage === 'tasks') {
        loadTasksData();
      }

      alert('任务删除成功');
    } else {
      const data = await response.json();
      alert(data.message || '删除任务失败');
    }
  } catch (error) {
    handleApiError(error, '删除任务过程中发生错误');
  }
}

// 切换任务状态
async function toggleTaskStatus(taskId, completed) {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`/api/tasks/${taskId}/status`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: completed ? 'completed' : 'in_progress' })
    });

    if (response.ok) {
      // 重新加载数据
      if (currentPage === 'dashboard') {
        loadDashboardData();
      } else if (currentPage === 'tasks') {
        loadTasksData();
      }
    } else {
      const data = await response.json();
      alert(data.message || '更新任务状态失败');
    }
  } catch (error) {
    handleApiError(error, '更新任务状态过程中发生错误');
  }
}

// 加载日程数据
async function loadScheduleData() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const response = await fetch('/api/schedules', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    schedules = await response.json();
    updateFullFishbone();
    loadUpcomingSchedules();
  } catch (error) {
    handleApiError(error, '加载日程数据失败，请刷新页面重试');
  }
}

// 更新完整鱼骨图
function updateFullFishbone() {
  // 检查元素是否存在
  const fishboneContainer = document.getElementById('fishbone-chart');
  if (!fishboneContainer) {
    console.warn('找不到鱼骨图容器元素 #fishbone-chart');
    return;
  }

  fishboneContainer.innerHTML = '';

  // 创建鱼骨架
  const spine = document.createElement('div');
  spine.className = 'fishbone-spine';
  fishboneContainer.appendChild(spine);

  // 获取当前周的开始和结束日期
  const weekStart = getStartOfWeek(currentWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // 更新周标题
  const weekRangeElement = document.getElementById('current-week-range');
  if (weekRangeElement) {
    const weekRange = `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;
    weekRangeElement.textContent = weekRange;
  }

  // 筛选当前周的日程
  const weekSchedules = schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.start_time);
    return scheduleDate >= weekStart && scheduleDate <= weekEnd;
  });

  // 创建每一天的日程显示
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);
    
    const dayElement = document.createElement('div');
    dayElement.className = 'fishbone-day';
    dayElement.style.left = `${i * 14}%`;
    
    // 日期标签
    const dayLabel = document.createElement('div');
    dayLabel.className = 'fishbone-day-label';
    const dayName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayDate.getDay()];
    dayLabel.textContent = `${dayName} ${dayDate.getMonth() + 1}/${dayDate.getDate()}`;
    
    // 上半部分事件
    const eventsTop = document.createElement('div');
    eventsTop.className = 'fishbone-events-top';
    
    // 下半部分事件
    const eventsBottom = document.createElement('div');
    eventsBottom.className = 'fishbone-events-bottom';
    
    // 添加当天的日程
    const daySchedules = weekSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.start_time);
      return scheduleDate.getDate() === dayDate.getDate() && 
             scheduleDate.getMonth() === dayDate.getMonth() && 
             scheduleDate.getFullYear() === dayDate.getFullYear();
    });

    // 将日程分为上午和下午
    daySchedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.start_time);
      const hour = scheduleTime.getHours();
      
      const eventElement = document.createElement('div');
      let timeClass = '';
      if (hour < 12) {
        timeClass = 'fishbone-event-morning';
        eventsTop.appendChild(eventElement);
      } else if (hour < 18) {
        timeClass = 'fishbone-event-afternoon';
        eventsBottom.appendChild(eventElement);
      } else {
        timeClass = 'fishbone-event-evening';
        eventsBottom.appendChild(eventElement);
      }

      eventElement.className = `fishbone-event ${timeClass}`;
      eventElement.textContent = schedule.title;
      eventElement.setAttribute('data-schedule-id', schedule.id);
      
      // 添加点击事件查看详情
      eventElement.addEventListener('click', () => viewScheduleDetails(schedule.id));
    });

    dayElement.appendChild(eventsTop);
    dayElement.appendChild(dayLabel);
    dayElement.appendChild(eventsBottom);
    fishboneContainer.appendChild(dayElement);
  }
}

// 加载即将到来的日程
function loadUpcomingSchedules() {
  const container = document.getElementById('upcoming-schedules-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  // 获取今天及以后的日程
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingSchedules = schedules
    .filter(schedule => new Date(schedule.start_time) >= today)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 6);

  if (upcomingSchedules.length === 0) {
    container.innerHTML = '<div class="text-center p-3">暂无即将到来的日程</div>';
    return;
  }

  upcomingSchedules.forEach(schedule => {
    const startTime = new Date(schedule.start_time);
    const formattedDate = startTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const scheduleElement = document.createElement('div');
    scheduleElement.className = 'upcoming-item';
    scheduleElement.innerHTML = `
      <div class="upcoming-header">
        <div class="upcoming-title">${schedule.title}</div>
        <div class="upcoming-time">${formattedDate}</div>
      </div>
      <div class="upcoming-location">
        <i class="fas fa-map-marker-alt"></i> ${schedule.location || '未指定地点'}
      </div>
    `;
    
    scheduleElement.addEventListener('click', () => viewScheduleDetails(schedule.id));
    container.appendChild(scheduleElement);
  });
}

// 查看日程详情
function viewScheduleDetails(scheduleId) {
  // 查找对应日程
  const schedule = schedules.find(s => s.id == scheduleId);
  if (!schedule) return;

  // 填充详情
  const titleEl = document.getElementById('schedule-title');
  if (titleEl) titleEl.textContent = schedule.title || '未命名日程';

  const descEl = document.getElementById('schedule-description');
  if (descEl) descEl.textContent = schedule.description || '无描述';
  
  const startEl = document.getElementById('schedule-start-time');
  if (startEl && schedule.start_time) {
    startEl.textContent = new Date(schedule.start_time).toLocaleString('zh-CN');
  }

  const endEl = document.getElementById('schedule-end-time');
  if (endEl) {
    endEl.textContent = schedule.end_time ? 
      new Date(schedule.end_time).toLocaleString('zh-CN') : 
      '无结束时间';
  }

  const locEl = document.getElementById('schedule-location');
  if (locEl) locEl.textContent = schedule.location || '未指定地点';

  // 打开详情模态框
  openModal('schedule-details-modal');
}

// 添加新日程
async function handleAddSchedule() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const title = document.getElementById('schedule-title').value;
    const description = document.getElementById('schedule-description').value;
    const location = document.getElementById('schedule-location').value;
    const startTime = document.getElementById('schedule-start-time').value;
    const endTime = document.getElementById('schedule-end-time').value;

    if (!title || !startTime) {
      alert('请输入日程标题和开始时间');
      return;
    }

    const response = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        description,
        location,
        start_time: startTime,
        end_time: endTime || null
      })
    });

    if (response.ok) {
      // 关闭模态框
      const modalElement = document.getElementById('add-schedule-modal');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();

      // 重置表单
      document.getElementById('add-schedule-form').reset();

      // 重新加载数据
      if (currentPage === 'dashboard') {
        loadDashboardData();
      } else if (currentPage === 'schedule') {
        loadScheduleData();
      }

      alert('日程创建成功');
    } else {
      const data = await response.json();
      alert(data.message || '创建日程失败');
    }
  } catch (error) {
    handleApiError(error, '创建日程过程中发生错误');
  }
}

// 加载通知数据
async function loadNotificationsData() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const response = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    notifications = await response.json();
    
    // 更新通知页面
    updateNotificationsPage();
    
    // 更新头部通知计数
    updateNotificationCount();
  } catch (error) {
    handleApiError(error, '加载通知数据失败，请刷新页面重试');
  }
}

// 切换通知下拉菜单
function toggleNotificationDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('notification-dropdown');
  
  if (dropdown.classList.contains('show')) {
    dropdown.classList.remove('show');
  } else {
    dropdown.classList.add('show');
    updateNotificationDropdown();
  }
}

// 更新通知下拉菜单内容
function updateNotificationDropdown() {
  const notificationsList = document.getElementById('notification-dropdown-list');
  
  // 清空现有内容
  notificationsList.innerHTML = '';
  
  // 如果还没有加载通知数据，先加载
  if (notifications.length === 0) {
    notificationsList.innerHTML = '<div class="dropdown-notification-placeholder">加载中...</div>';
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    
    fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
      notifications = data;
      renderNotificationDropdown();
    })
    .catch(error => {
      handleApiError(error, '加载通知失败');
      notificationsList.innerHTML = '<div class="dropdown-notification-placeholder">加载通知失败</div>';
    });
  } else {
    renderNotificationDropdown();
  }
}

// 渲染通知下拉菜单内容
function renderNotificationDropdown() {
  const notificationsList = document.getElementById('notification-dropdown-list');
  
  // 清空现有内容
  notificationsList.innerHTML = '';
  
  if (notifications.length === 0) {
    notificationsList.innerHTML = '<div class="dropdown-notification-placeholder">暂无通知</div>';
    return;
  }
  
  // 获取最近的5条通知
  const recentNotifications = notifications
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);
  
  // 添加通知项
  recentNotifications.forEach(notification => {
    const notificationItem = document.createElement('div');
    notificationItem.className = `dropdown-notification ${getNotificationTypeClass(notification.type)}`;
    notificationItem.setAttribute('data-reference-id', notification.reference_id || '');
    notificationItem.setAttribute('data-type', notification.type || '');
    
    const notificationTime = new Date(notification.created_at).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    notificationItem.innerHTML = `
      <div class="dropdown-notification-title">${notification.title}</div>
      <div class="dropdown-notification-content">${notification.content}</div>
      <div class="dropdown-notification-time">${notificationTime}</div>
    `;
    
    notificationItem.addEventListener('click', () => {
      toggleNotificationDropdown(); // 关闭下拉菜单
      handleNotificationClick(notification);
    });
    
    notificationsList.appendChild(notificationItem);
  });
}

// 更新通知计数
function updateNotificationCount() {
  // 计算未读通知数量
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const notificationCountElement = document.getElementById('notification-count');
  
  if (notificationCountElement) {
    notificationCountElement.textContent = unreadCount;
    
    // 如果没有通知，隐藏计数徽章
    if (unreadCount === 0) {
      notificationCountElement.style.display = 'none';
    } else {
      notificationCountElement.style.display = 'flex';
    }
  }
}

// 更新通知页面
function updateNotificationsPage() {
  // 检查通知页面是否存在
  const container = document.getElementById('notifications-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (notifications.length === 0) {
    container.innerHTML = '<div class="alert alert-info">暂无通知</div>';
    return;
  }
  
  // 创建通知列表
  const notificationList = document.createElement('div');
  notificationList.className = 'notification-list';
  
  notifications.forEach(notification => {
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification-item ${getNotificationTypeClass(notification.type)}`;
    // 添加数据属性存储引用ID和类型
    notificationElement.setAttribute('data-reference-id', notification.reference_id || '');
    notificationElement.setAttribute('data-type', notification.type || '');
    notificationElement.setAttribute('data-id', notification.id);
    
    // 如果已读，添加已读样式
    if (notification.is_read) {
      notificationElement.classList.add('is-read');
    }
    
    const notificationTime = new Date(notification.created_at).toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    notificationElement.innerHTML = `
      <div class="notification-header">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-time">${notificationTime}</div>
      </div>
      <div class="notification-content">${notification.content}</div>
    `;
    
    // 添加点击事件处理
    notificationElement.addEventListener('click', () => handleNotificationClick(notification));
    
    notificationList.appendChild(notificationElement);
  });
  
  container.appendChild(notificationList);
}

// 获取通知类型样式类
function getNotificationTypeClass(type) {
  switch (type) {
    case 'task':
      return 'task-notification';
    case 'announcement':
      return 'announcement-notification';
    case 'schedule':
      return 'schedule-notification';
    default:
      return '';
  }
}

// 筛选通知
function filterNotifications() {
  const typeFilter = document.getElementById('notification-type-filter').value;
  const notificationItems = document.querySelectorAll('#notifications-container .notification-item');
  
  notificationItems.forEach(item => {
    const type = item.getAttribute('data-type');
    if (typeFilter === 'all' || type === typeFilter) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

// 新增：处理通知点击
function handleNotificationClick(notification) {
  // 标记通知为已读
  if (!notification.is_read) {
    markNotificationAsRead(notification.id);
    notification.is_read = true;
  }
  
  if (!notification.type || !notification.reference_id) return;
  
  switch (notification.type) {
    case 'task':
      // 查看任务详情
      const taskId = notification.reference_id;
      const task = tasks.find(t => t.id == taskId);
      if (task) {
        editTask(taskId); // 使用现有的编辑任务函数打开任务详情
      } else {
        // 如果任务不在本地缓存，则重新加载
        loadTasksData().then(() => {
          const reloadedTask = tasks.find(t => t.id == taskId);
          if (reloadedTask) {
            editTask(taskId);
          } else {
            alert('找不到相关任务信息');
          }
        });
      }
      break;
      
    case 'schedule':
      // 查看日程详情
      const scheduleId = notification.reference_id;
      const schedule = schedules.find(s => s.id == scheduleId);
      if (schedule) {
        viewScheduleDetails(scheduleId);
      } else {
        loadScheduleData().then(() => {
          const reloadedSchedule = schedules.find(s => s.id == scheduleId);
          if (reloadedSchedule) {
            viewScheduleDetails(scheduleId);
          } else {
            alert('找不到相关日程信息');
          }
        });
      }
      break;
      
    case 'announcement':
      // 仅显示公告内容，无需跳转
      break;
  }
}

// 标记通知为已读
async function markNotificationAsRead(notificationId) {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      // 更新本地通知数据
      const notification = notifications.find(n => n.id == notificationId);
      if (notification) {
        notification.is_read = true;
      }
      
      // 更新UI
      updateNotificationCount();
      
      // 如果通知下拉框正在显示，更新其显示
      const dropdown = document.getElementById('notification-dropdown');
      if (dropdown && dropdown.classList.contains('show')) {
        renderNotificationDropdown();
      }
      
      // 如果在通知页面，更新通知项的样式
      if (currentPage === 'notifications') {
        const notificationItem = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (notificationItem) {
          notificationItem.classList.add('is-read');
        }
      }
    }
  } catch (error) {
    console.error('标记通知已读错误:', error);
    // 这里不需要显示错误，因为这是后台操作
  }
}

// 新增：处理发布公告
async function handleAddNotification() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const title = document.getElementById('notification-title').value;
    const content = document.getElementById('notification-content').value;
    const isPublic = document.getElementById('notification-public').checked;

    if (!title || !content) {
      alert('请输入公告标题和内容');
      return;
    }

    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        content,
        is_public: isPublic
      })
    });

    if (response.ok) {
      // 关闭模态框
      const modalElement = document.getElementById('add-notification-modal');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();

      // 重置表单
      document.getElementById('add-notification-form').reset();

      // 重新加载数据
      loadNotificationsData();
      
      alert('公告发布成功');
    } else {
      const data = await response.json();
      alert(data.message || '发布公告失败');
    }
  } catch (error) {
    handleApiError(error, '发布公告过程中发生错误');
  }
}

// 加载成员管理页面数据
async function loadUsersData() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    // 如果当前用户不是管理员，显示提醒并返回
    if (currentUser && currentUser.role !== 'admin') {
      document.getElementById('users-page').innerHTML = '<div class="alert alert-warning">您没有权限访问此页面</div>';
      return;
    }

    const response = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    users = await response.json();
    updateUsersTable();
  } catch (error) {
    handleApiError(error, '加载用户数据失败，请刷新页面重试');
  }
}

// 更新用户表格
function updateUsersTable() {
  const tableBody = document.getElementById('users-table-body');
  tableBody.innerHTML = '';

  // 获取筛选值
  const roleFilter = document.getElementById('user-role-filter').value;
  const departmentFilter = document.getElementById('user-department-filter').value;

  // 应用筛选
  let filteredUsers = users;
  if (roleFilter !== 'all') {
    filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
  }
  if (departmentFilter !== 'all') {
    filteredUsers = filteredUsers.filter(user => user.department === departmentFilter);
  }

  if (filteredUsers.length === 0) {
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = `<td colspan="7" class="text-center">暂无用户数据</td>`;
    tableBody.appendChild(noDataRow);
    return;
  }

  filteredUsers.forEach(user => {
    const row = document.createElement('tr');
    const avatarUrl = user.avatar ? `img/avatars/${user.avatar}` : 'img/default-avatar.jpg';
    const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知';
    const department = user.department || '未分配';
    const roleBadge = user.role === 'admin' ? '<span class="badge bg-danger">管理员</span>' : '<span class="badge bg-primary">成员</span>';

    row.innerHTML = `
      <td><img src="${avatarUrl}" alt="${user.name}" class="rounded-circle" width="40" height="40"></td>
      <td>${user.username || ''}</td>
      <td>${user.name}</td>
      <td>${department}</td>
      <td>${roleBadge}</td>
      <td>${createdAt}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button type="button" class="btn btn-outline-primary" data-action="edit" data-user-id="${user.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button type="button" class="btn btn-outline-danger" data-action="delete" data-user-id="${user.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    `;

    // 添加用户操作事件
    row.querySelector('[data-action="edit"]').addEventListener('click', () => editUser(user.id));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteUser(user.id));

    tableBody.appendChild(row);
  });
}

// 筛选用户
function filterUsers() {
  updateUsersTable();
}

// 打开用户模态框
function openUserModal(userId = null) {
  // 重置表单
  document.getElementById('user-form').reset();
  document.getElementById('avatar-preview').src = 'img/default-avatar.jpg';
  document.getElementById('user-id').value = '';

  // 设置标题
  const modalElement = document.getElementById('user-modal');
  modalElement.querySelector('.modal-title').textContent = userId ? '编辑成员' : '添加新成员';
  
  // 如果是编辑模式，填充数据
  if (userId) {
    const user = users.find(u => u.id == userId);
    if (user) {
      document.getElementById('user-username').value = user.username || '';
      document.getElementById('user-username').disabled = true; // 不允许修改用户名
      document.getElementById('user-name').value = user.name || '';
      document.getElementById('user-department').value = user.department || '';
      document.getElementById('user-role').value = user.role || 'member';
      document.getElementById('user-id').value = user.id;
      if (user.avatar) {
        document.getElementById('avatar-preview').src = `img/avatars/${user.avatar}`;
      }
      // 密码字段为空，表示不修改
      document.getElementById('user-password').value = '';
    }
  } else {
    // 新增用户时启用用户名输入
    document.getElementById('user-username').disabled = false;
  }

  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

// 保存用户
async function handleSaveUser() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const userId = document.getElementById('user-id').value;
    const isEditing = !!userId;
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;
    const name = document.getElementById('user-name').value;
    const department = document.getElementById('user-department').value;
    const role = document.getElementById('user-role').value;

    // 验证表单
    if (!name) {
      alert('请输入成员姓名');
      return;
    }
    if (!isEditing && !username) {
      alert('请输入用户名');
      return;
    }
    if (!isEditing && !password) {
      alert('请输入密码');
      return;
    }

    // 准备请求数据
    const userData = {
      name,
      department,
      role
    };
    if (!isEditing) {
      userData.username = username;
      userData.password = password;
    } else if (password) {
      // 编辑模式且输入了密码，则更新密码
      userData.password = password;
    }

    const url = isEditing ? `/api/users/${userId}` : '/api/users';
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (response.ok) {
      // 关闭模态框
      const modalElement = document.getElementById('user-modal');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();

      // 重新加载数据
      loadUsersData();

      alert(isEditing ? '成员信息更新成功' : '成员添加成功');
    } else {
      const data = await response.json();
      alert(data.message || (isEditing ? '更新成员失败' : '添加成员失败'));
    }
  } catch (error) {
    handleApiError(error, '保存成员信息过程中发生错误');
  }
}

// 编辑用户
function editUser(userId) {
  openUserModal(userId);
}

// 删除用户
async function deleteUser(userId) {
  // 阻止删除当前登录用户
  if (currentUser && userId == currentUser.id) {
    alert('您不能删除自己的账号');
    return;
  }

  if (!confirm('确定要删除此成员吗？此操作不可逆！')) return;

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      // 重新加载数据
      loadUsersData();
      alert('成员删除成功');
    } else {
      const data = await response.json();
      alert(data.message || '删除成员失败');
    }
  } catch (error) {
    handleApiError(error, '删除成员过程中发生错误');
  }
}

// 切换侧边栏
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('collapsed');
}

// 切换深色/浅色模式
function toggleDarkMode() {
  darkMode = !darkMode;
  document.body.classList.toggle('dark-mode', darkMode);
  
  // 更新主题设置
  const theme = darkMode ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
  
  // 更新设置页面的单选框
  if (currentPage === 'settings') {
    if (darkMode) {
      document.getElementById('theme-dark').checked = true;
    } else {
      document.getElementById('theme-light').checked = true;
    }
  };
  
  // 更新图标
  const themeSwitch = document.querySelector('.theme-switch i');
  if (themeSwitch) {
    themeSwitch.className = darkMode ? 'fas fa-sun' : 'fas fa-moon';
  }
}

// 加载设置页面数据
function loadSettingsData() {
  // 填充用户个人信息
  if (currentUser) {
    document.getElementById('personal-name').value = currentUser.name || '';
    document.getElementById('personal-department').value = currentUser.department || '';
    
    // 填充浏览器信息
    const browserInfo = `${navigator.userAgent}`;
    document.getElementById('browser-info').textContent = browserInfo;
  }

  // 设置主题选项
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.getElementById('theme-dark').checked = true;
  } else if (savedTheme === 'auto') {
    document.getElementById('theme-auto').checked = true;
  } else {
    document.getElementById('theme-light').checked = true;
  }

  // 加载通知设置偏好
  try {
    const notificationSettings = JSON.parse(localStorage.getItem('settings.notifications')) || {};
    document.getElementById('email-notifications').checked = notificationSettings.email !== false;
    document.getElementById('task-notifications').checked = notificationSettings.task !== false;
    document.getElementById('system-notifications').checked = notificationSettings.system !== false;
  } catch (error) {
    console.warn('加载通知设置失败', error);
    // 使用默认值
    document.getElementById('email-notifications').checked = true;
    document.getElementById('task-notifications').checked = true;
    document.getElementById('system-notifications').checked = true;
  }
}

// 保存个人设置
async function savePersonalSettings() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token || !currentUser) return;

    const name = document.getElementById('personal-name').value;
    const department = document.getElementById('personal-department').value;
    const password = document.getElementById('personal-password').value;
    const confirmPassword = document.getElementById('personal-password-confirm').value;

    // 基本验证
    if (!name) {
      alert('请输入姓名');
      return;
    }

    // 密码验证
    if (password && password !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }

    // 准备更新数据
    const userData = {
      name,
      department
    };
    if (password) {
      userData.password = password;
    }

    // 发送更新请求
    const response = await fetch(`/api/users/${currentUser.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (response.ok) {
      const updatedUser = await response.json();
      currentUser.name = updatedUser.name;
      currentUser.department = updatedUser.department;

      // 更新界面显示
      updateUserInfo();

      // 清空密码字段
      document.getElementById('personal-password').value = '';
      document.getElementById('personal-password-confirm').value = '';

      alert('个人设置已更新');
    } else {
      const data = await response.json();
      alert(data.message || '更新设置失败');
    }
  } catch (error) {
    handleApiError(error, '保存设置过程中发生错误');
  }
}

// 保存系统设置
function saveSystemSettings() {
  try {
    // 获取主题设置
    let theme = 'light';
    if (document.getElementById('theme-dark').checked) {
      theme = 'dark';
    } else if (document.getElementById('theme-auto').checked) {
      theme = 'auto';
    }
    
    // 保存主题设置
    localStorage.setItem('theme', theme);
    setTheme(theme);

    // 获取通知设置
    const emailNotifications = document.getElementById('email-notifications').checked;
    const taskNotifications = document.getElementById('task-notifications').checked;
    const systemNotifications = document.getElementById('system-notifications').checked;

    // 保存通知设置
    localStorage.setItem('settings.notifications', JSON.stringify({
      email: emailNotifications,
      task: taskNotifications,
      system: systemNotifications
    }));

    alert('系统设置已保存');
  } catch (error) {
    handleApiError(error, '保存设置过程中发生错误');
  }
}

// 设置主题
function setTheme(theme) {
  // 移除现有主题类
  document.body.classList.remove('dark-mode');
  
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    darkMode = true;
  } else if (theme === 'auto') {
    // 检查系统偏好
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-mode');
      darkMode = true;
    } else {
      darkMode = false;
    }
    
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (localStorage.getItem('theme') === 'auto') {
        if (e.matches) {
          document.body.classList.add('dark-mode');
          darkMode = true;
        } else {
          document.body.classList.remove('dark-mode');
          darkMode = false;
        }
      }
    });
  } else {
    darkMode = false;
  }
  
  // 更新开关图标
  const themeSwitch = document.querySelector('.theme-switch i');
  if (themeSwitch) {
    themeSwitch.className = darkMode ? 'fas fa-sun' : 'fas fa-moon';
  }
}

// 处理API错误
function handleApiError(error, defaultMessage) {
  console.error(error);
  // 检查是否是网络连接问题
  if (!navigator.onLine) {
    alert('网络连接问题，请检查您的网络设置并重试');
    return;
  }
  alert(error.message || defaultMessage || '操作过程中发生错误，请稍后重试');
}