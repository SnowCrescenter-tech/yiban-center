// 导航栏滚动效果
window.addEventListener('scroll', function() {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// 平滑滚动到锚点
document.querySelectorAll('.navbar-nav a, .hero-btns a').forEach(anchor => {
  if (anchor.getAttribute('href').startsWith('#')) {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 70,
          behavior: 'smooth'
        });
        
        // 更新活动链接
        document.querySelectorAll('.navbar-nav .nav-link').forEach(navLink => {
          navLink.classList.remove('active');
        });
        this.classList.add('active');
      }
    });
  }
});

// 计数器动画
function startCounters() {
  const counters = document.querySelectorAll('.counter-value');
  
  const animateCounter = counter => {
    const target = parseInt(counter.getAttribute('data-count'));
    let count = 0;
    const duration = 1500; // 动画持续时间（毫秒）
    const step = target / (duration / 30); // 每30毫秒更新一次
    
    const updateCount = () => {
      count += step;
      if (count < target) {
        counter.innerText = Math.ceil(count);
        requestAnimationFrame(updateCount);
      } else {
        counter.innerText = target;
      }
    };
    
    updateCount();
  };
  
  // 使用Intersection Observer检测元素是否可见
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target); // 只触发一次
      }
    });
  }, { threshold: 0.5 });
  
  counters.forEach(counter => {
    observer.observe(counter);
  });
}

// 返回顶部按钮
function handleBackToTop() {
  const backToTopButton = document.querySelector('.back-to-top');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTopButton.classList.add('show');
    } else {
      backToTopButton.classList.remove('show');
    }
  });
  
  backToTopButton.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// 导航菜单交互（移动端）
function setupMobileNav() {
  const navbarToggler = document.querySelector('.navbar-toggler');
  const navbarCollapse = document.querySelector('.navbar-collapse');
  
  // 点击导航链接后关闭菜单
  document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 992) {
        navbarCollapse.classList.remove('show');
      }
    });
  });
}

// 监听滚动更新当前导航项
function updateActiveNavOnScroll() {
  const sections = document.querySelectorAll('section[id]');
  
  window.addEventListener('scroll', () => {
    let scrollY = window.scrollY;
    
    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 100;
      const sectionId = section.getAttribute('id');
      
      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        document.querySelector('.navbar-nav .nav-link[href="#' + sectionId + '"]')?.classList.add('active');
      } else {
        document.querySelector('.navbar-nav .nav-link[href="#' + sectionId + '"]')?.classList.remove('active');
      }
    });
  });
}

// 表单提交处理
function handleFormSubmit() {
  const contactForm = document.querySelector('.contact-form');
  
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // 这里可以添加表单验证和AJAX提交
      alert('感谢您的留言！我们会尽快回复。');
      this.reset();
    });
  }
}

// 动画效果
function setupAnimations() {
  // 检查元素是否在视口中
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const animateOnScroll = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate__animated');
        
        if (entry.target.classList.contains('fadeInLeft')) {
          entry.target.classList.add('animate__fadeInLeft');
        } else if (entry.target.classList.contains('fadeInRight')) {
          entry.target.classList.add('animate__fadeInRight');
        } else if (entry.target.classList.contains('fadeInUp')) {
          entry.target.classList.add('animate__fadeInUp');
        } else {
          entry.target.classList.add('animate__fadeIn');
        }
        
        animateOnScroll.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // 添加需要动画的元素
  document.querySelectorAll('.about-img, .about-content, .counter, .award-card, .activity-card, .team-member, .department-card').forEach(el => {
    animateOnScroll.observe(el);
  });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  startCounters();
  handleBackToTop();
  setupMobileNav();
  updateActiveNavOnScroll();
  handleFormSubmit();
  setupAnimations();
  
  // 添加工作站链接检查
  const loginButtons = document.querySelectorAll('a[href="/workstation"]');
  loginButtons.forEach(btn => {
    console.log("找到工作站链接:", btn.href);
    // 确保链接有效
    btn.addEventListener('click', function(e) {
      console.log("点击工作站链接");
    });
  });
});