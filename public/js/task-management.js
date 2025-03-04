/**
 * 任务管理相关功能
 */

// 当前选中的成员列表
let selectedMembers = [];

// 初始化任务表单
function initTaskForm() {
  // 监听部门任务开关
  const isDepartmentTask = document.getElementById('task-is-department-task');
  const departmentField = document.getElementById('task-department');
  const membersSection = document.getElementById('task-members-section');
  
  if (isDepartmentTask) {
    isDepartmentTask.addEventListener('change', function() {
      // 如果是部门任务，显示部门选择
      if (this.checked) {
        departmentField.parentElement.style.display = '';
        // 如果当前用户有部门，自动填充
        if (currentUser && currentUser.department) {
          departmentField.value = currentUser.department;
        }
        // 显示成员管理部分
        membersSection.style.display = '';
      } else {
        // 如果不是部门任务，隐藏部门选择
        departmentField.parentElement.style.display = 'none';
        // 隐藏成员管理部分
        membersSection.style.display = 'none';
        // 清空选中的成员
        selectedMembers = [];
        updateMembersList();
      }
    });
  }
  
  // 初始化成员选择器
  const memberSelector = document.getElementById('task-add-member');
  if (memberSelector) {
    memberSelector.addEventListener('change', function() {
      const userId = this.value;
      if (userId) {
        addMemberToTask(userId);
        this.value = ''; // 重置选择器
      }
    });
  }
}

// 为任务添加成员
function addMemberToTask(userId) {
  userId = parseInt(userId);
  
  // 检查是否已经添加
  if (selectedMembers.some(member => member.id === userId)) {
    return;
  }
  
  // 查找用户信息
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  // 添加到已选列表
  selectedMembers.push(user);
  
  // 更新界面
  updateMembersList();
}

// 从任务中移除成员
function removeMemberFromTask(userId) {
  userId = parseInt(userId);
  selectedMembers = selectedMembers.filter(member => member.id !== userId);
  updateMembersList();
}

// 更新成员列表显示
function updateMembersList() {
  const memberList = document.getElementById('task-members-list');
  if (!memberList) return;
  
  memberList.innerHTML = '';
  
  if (selectedMembers.length === 0) {
    memberList.innerHTML = '<li class="list-group-item text-muted">暂未添加成员</li>';
    return;
  }
  
  // 添加每个成员
  selectedMembers.forEach(member => {
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex justify-content-between align-items-center';
    
    const avatarUrl = member.avatar ? `img/avatars/${member.avatar}` : 'img/default-avatar.jpg';
    
    item.innerHTML = `
      <div class="d-flex align-items-center">
        <img src="${avatarUrl}" class="rounded-circle me-2" width="30" height="30">
        <div>
          <div>${member.name}</div>
          <small class="text-muted">${member.department || '无部门'}</small>
        </div>
      </div>
      <button type="button" class="btn btn-sm btn-outline-danger" data-user-id="${member.id}">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // 添加移除按钮事件
    item.querySelector('button').addEventListener('click', () => removeMemberFromTask(member.id));
    
    memberList.appendChild(item);
  });
}

// 加载任务编辑表单
function loadTaskEditForm(task) {
  // 填充基本信息
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-assigned-to').value = task.assigned_to || '';
  document.getElementById('task-priority').value = task.priority;
  
  // 处理部门任务信息
  const isDepartmentTask = document.getElementById('task-is-department-task');
  const departmentField = document.getElementById('task-department');
  
  if (isDepartmentTask) {
    isDepartmentTask.checked = task.is_department_task;
    
    // 触发部门任务切换事件
    const event = new Event('change');
    isDepartmentTask.dispatchEvent(event);
    
    // 设置部门值
    if (task.department) {
      departmentField.value = task.department;
    }
  }
  
  // 设置成员
  if (task.members && task.members.length > 0) {
    selectedMembers = [...task.members];
    updateMembersList();
  } else {
    selectedMembers = [];
    updateMembersList();
  }
  
  // 设置截止日期
  if (task.due_date) {
    // 转换日期时间格式为 input datetime-local 接受的格式
    const dueDate = new Date(task.due_date);
    const formattedDate = dueDate.toISOString().slice(0, 16);
    document.getElementById('task-due-date').value = formattedDate;
  } else {
    document.getElementById('task-due-date').value = '';
  }
}

// 获取任务表单数据
function getTaskFormData() {
  const title = document.getElementById('task-title').value;
  const description = document.getElementById('task-description').value;
  const assignedTo = document.getElementById('task-assigned-to').value;
  const priority = document.getElementById('task-priority').value;
  const dueDate = document.getElementById('task-due-date').value;
  
  // 处理部门任务选项
  const isDepartmentTask = document.getElementById('task-is-department-task')?.checked || false;
  const department = isDepartmentTask ? document.getElementById('task-department').value : null;
  
  // 获取成员ID列表
  const members = selectedMembers.map(member => member.id);
  
  return {
    title,
    description,
    assigned_to: assignedTo || null,
    priority,
    due_date: dueDate || null,
    is_department_task: isDepartmentTask,
    department,
    members
  };
}

// 创建或更新任务
async function saveTask(isEditing, taskId) {
  const formData = getTaskFormData();
  
  // 验证必填字段
  if (!formData.title) {
    alert('请输入任务标题');
    return;
  }
  
  // 如果是部门任务，验证部门
  if (formData.is_department_task && !formData.department) {
    alert('部门任务需要选择部门');
    return;
  }
  
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      alert('您的会话已过期，请重新登录');
      return;
    }
    
    const url = isEditing ? `/api/tasks/${taskId}` : '/api/tasks';
    const method = isEditing ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    if (response.ok) {
      // 关闭模态框
      const modalElement = document.getElementById('add-task-modal');
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
      
      // 重置表单
      document.getElementById('add-task-form').reset();
      selectedMembers = [];
      updateMembersList();
      
      // 重新加载数据
      if (currentPage === 'dashboard') {
        loadDashboardData();
      } else if (currentPage === 'tasks') {
        loadTasksData();
      }
      
      alert(isEditing ? '任务更新成功' : '任务创建成功');
    } else {
      const data = await response.json();
      alert(data.message || (isEditing ? '更新任务失败' : '创建任务失败'));
    }
  } catch (error) {
    console.error('保存任务错误:', error);
    alert('保存任务过程中发生错误');
  }
}

// 为任务管理功能添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
  // 初始化任务表单
  initTaskForm();
  
  // 修改保存任务按钮事件
  const saveTaskBtn = document.getElementById('save-task-btn');
  if (saveTaskBtn) {
    saveTaskBtn.addEventListener('click', function() {
      const form = document.getElementById('add-task-form');
      const isEditing = form.dataset.editing === 'true';
      const taskId = form.dataset.taskId;
      saveTask(isEditing, taskId);
    });
  }
  
  // 任务模态框显示事件
  const taskModal = document.getElementById('add-task-modal');
  if (taskModal) {
    taskModal.addEventListener('show.bs.modal', function(event) {
      const button = event.relatedTarget;
      const form = document.getElementById('add-task-form');
      
      // 确定是创建还是编辑任务
      if (button && button.getAttribute('data-action') === 'edit') {
        const taskId = button.getAttribute('data-task-id');
        form.dataset.editing = 'true';
        form.dataset.taskId = taskId;
        
        // 加载任务数据
        const task = tasks.find(t => t.id == taskId);
        if (task) {
          loadTaskEditForm(task);
        }
        
        // 修改模态框标题
        this.querySelector('.modal-title').textContent = '编辑任务';
      } else {
        // 重置表单和标题
        form.reset();
        form.dataset.editing = 'false';
        form.dataset.taskId = '';
        selectedMembers = [];
        updateMembersList();
        this.querySelector('.modal-title').textContent = '添加新任务';
        
        // 隐藏部门选择和成员管理
        const departmentField = document.getElementById('task-department');
        if (departmentField) departmentField.parentElement.style.display = 'none';
        
        const membersSection = document.getElementById('task-members-section');
        if (membersSection) membersSection.style.display = 'none';
      }
    });
    
    // 任务模态框关闭事件 - 清理表单
    taskModal.addEventListener('hidden.bs.modal', function() {
      const form = document.getElementById('add-task-form');
      form.reset();
      form.dataset.editing = 'false';
      form.dataset.taskId = '';
      selectedMembers = [];
      updateMembersList();
    });
  }
});
