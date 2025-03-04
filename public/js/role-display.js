/**
 * 角色权限显示相关功能
 */

// 翻译角色名称
function translateRoleName(role) {
  const roleMap = {
    'super_admin': '超级管理员',
    'admin': '管理员',
    'department_head': '部门负责人',
    'member': '普通成员'
  };
  return roleMap[role] || role;
}

// 根据角色获取徽章样式
function getRoleBadgeClass(role) {
  const badgeClassMap = {
    'super_admin': 'bg-danger',
    'admin': 'bg-warning',
    'department_head': 'bg-info',
    'member': 'bg-primary'
  };
  return `badge ${badgeClassMap[role] || 'bg-secondary'}`;
}

// 更新角色显示
function updateRoleDisplay() {
  // 更新用户表格中的角色显示
  document.querySelectorAll('[data-role]').forEach(element => {
    const role = element.getAttribute('data-role');
    element.textContent = translateRoleName(role);
    element.className = getRoleBadgeClass(role);
  });
}

// 检查用户权限并更新UI
function checkUserPermissions() {
  if (!currentUser) return;
  
  // 显示或隐藏基于角色的功能
  const isSuperAdmin = currentUser.role === 'super_admin';
  const isAdmin = currentUser.role === 'admin' || isSuperAdmin;
  const isDepartmentHead = currentUser.role === 'department_head' || isAdmin;
  
  // 超级管理员功能
  document.querySelectorAll('.super-admin-only').forEach(el => {
    el.style.display = isSuperAdmin ? '' : 'none';
  });
  
  // 管理员功能
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  
  // 部门负责人功能
  document.querySelectorAll('.department-head-only').forEach(el => {
    el.style.display = isDepartmentHead ? '' : 'none';
  });
  
  // 更新角色筛选下拉框
  updateRoleFilterOptions(isSuperAdmin, isAdmin);
}

// 根据权限更新角色筛选选项
function updateRoleFilterOptions(isSuperAdmin, isAdmin) {
  const roleFilter = document.getElementById('user-role-filter');
  if (!roleFilter) return;
  
  // 保存当前选中值
  const currentValue = roleFilter.value;
  
  // 清空现有选项
  roleFilter.innerHTML = '<option value="all">所有角色</option>';
  
  // 添加基于权限的角色选项
  if (isSuperAdmin) {
    roleFilter.innerHTML += `
      <option value="super_admin">超级管理员</option>
      <option value="admin">管理员</option>
      <option value="department_head">部门负责人</option>
      <option value="member">普通成员</option>
    `;
  } else if (isAdmin) {
    roleFilter.innerHTML += `
      <option value="admin">管理员</option>
      <option value="department_head">部门负责人</option>
      <option value="member">普通成员</option>
    `;
  } else if (isDepartmentHead) {
    roleFilter.innerHTML += `
      <option value="department_head">部门负责人</option>
      <option value="member">普通成员</option>
    `;
  } else {
    // 普通成员只能看到成员角色
    roleFilter.innerHTML += `<option value="member">普通成员</option>`;
  }
  
  // 尝试恢复之前选中的值
  if (currentValue && roleFilter.querySelector(`option[value="${currentValue}"]`)) {
    roleFilter.value = currentValue;
  }
}

// 初始化角色显示
document.addEventListener('DOMContentLoaded', function() {
  // 监听用户更新
  document.addEventListener('user:updated', function() {
    checkUserPermissions();
    updateRoleDisplay();
  });
  
  // 观察DOM变化，自动更新角色显示
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        updateRoleDisplay();
      }
    });
  });
  
  // 启动观察器
  observer.observe(document.body, { childList: true, subtree: true });
  
  // 初始检查权限
  if (currentUser) {
    checkUserPermissions();
    updateRoleDisplay();
  }
});