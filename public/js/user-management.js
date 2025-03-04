/**
 * 用户管理相关功能
 */

// 显示用户批量导入模态框
function showBatchImportModal() {
  // 重置表单
  document.getElementById('batch-import-form').reset();
  document.getElementById('import-result').style.display = 'none';
  
  // 显示模态框
  const modalElement = document.getElementById('batch-import-modal');
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

// 处理用户批量导入
async function handleBatchImport(e) {
  e.preventDefault();
  
  // 获取文件
  const fileInput = document.getElementById('excel-file');
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('请选择Excel文件');
    return;
  }
  
  const file = fileInput.files[0];
  
  // 检查文件类型
  if (!file.name.match(/\.(xlsx|xls)$/)) {
    alert('请上传Excel文件(.xlsx 或 .xls)');
    return;
  }
  
  // 显示加载状态
  const importBtn = document.getElementById('start-import-btn');
  const originalText = importBtn.innerHTML;
  importBtn.disabled = true;
  importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 导入中...';
  
  try {
    // 准备表单数据
    const formData = new FormData();
    formData.append('excel', file);
    
    // 获取认证令牌
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      alert('您的会话已过期，请重新登录');
      return;
    }
    
    // 发送请求
    const response = await fetch('/api/users/batch-import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    // 解析响应
    const result = await response.json();
    
    if (response.ok) {
      // 显示结果
      displayImportResult(result);
      
      // 如果有成功导入的用户，刷新用户列表
      if (result.success > 0) {
        loadUsersData();
      }
    } else {
      throw new Error(result.message || '导入失败');
    }
  } catch (error) {
    alert(`导入失败: ${error.message}`);
  } finally {
    // 恢复按钮状态
    importBtn.disabled = false;
    importBtn.innerHTML = originalText;
  }
}

// 显示导入结果
function displayImportResult(result) {
  const resultDiv = document.getElementById('import-result');
  resultDiv.style.display = 'block';
  
  // 更新统计数据
  document.getElementById('total-count').textContent = result.total;
  document.getElementById('success-count').textContent = result.success;
  document.getElementById('failed-count').textContent = result.failed;
  
  // 显示错误详情
  const errorListElement = document.getElementById('error-list');
  errorListElement.innerHTML = '';
  
  if (result.errors && result.errors.length > 0) {
    document.getElementById('error-details').style.display = 'block';
    
    result.errors.forEach(error => {
      const errorItem = document.createElement('li');
      errorItem.textContent = error;
      errorListElement.appendChild(errorItem);
    });
  } else {
    document.getElementById('error-details').style.display = 'none';
  }
}

// 初始化文件名显示
function initFileUpload() {
  const fileInput = document.getElementById('excel-file');
  const fileLabel = document.querySelector('.custom-file-label');
  
  if (fileInput && fileLabel) {
    fileInput.addEventListener('change', function() {
      if (this.files && this.files.length > 0) {
        fileLabel.textContent = this.files[0].name;
      } else {
        fileLabel.textContent = '选择Excel文件...';
      }
    });
  }
}

// 显示模板下载链接
function showTemplateInstructions() {
  alert(`
请按以下格式准备Excel文件：

必填列：
- username: 用户登录名
- password: 初始密码 
- name: 用户姓名

可选列：
- department: 部门名称
- role: 用户角色 (super_admin/admin/department_head/member)

注意：如不提供role，默认为普通成员(member)
  `);
}

// 为批量导入功能添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
  // 批量导入按钮
  const importBtn = document.getElementById('import-users-btn');
  if (importBtn) {
    importBtn.addEventListener('click', showBatchImportModal);
  }
  
  // 开始导入按钮
  const startImportBtn = document.getElementById('start-import-btn');
  if (startImportBtn) {
    startImportBtn.addEventListener('click', handleBatchImport);
  }
  
  // 模板说明按钮
  const templateBtn = document.getElementById('template-btn');
  if (templateBtn) {
    templateBtn.addEventListener('click', showTemplateInstructions);
  }
  
  // 初始化文件上传
  initFileUpload();
});
