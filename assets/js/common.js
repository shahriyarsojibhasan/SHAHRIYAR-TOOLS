/**
 * SHAHRIYAR TOOLS - COMMON SCRIPTS (common.js)
 * Clean, lightweight, dependency-free utility helpers
 */

(function () {
  'use strict';

  function initPlatform() {
    // 1. Header scroll shadow
    const header = document.querySelector('.site-header');
    if (header) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }, { passive: true });
    }

    // 2. Mobile Menu Setup & Auto-Fallback
    let mobileNav = document.querySelector('.mobile-nav');
    const mobileBtn = document.querySelector('.mobile-menu-btn');

    // Auto-create mobile nav if not present in markup
    if (!mobileNav && header) {
      mobileNav = document.createElement('div');
      mobileNav.className = 'mobile-nav';
      mobileNav.setAttribute('aria-label', 'Mobile Navigation');

      const isSub = window.location.pathname.includes('/') && !window.location.pathname.endsWith('/SHAHRIYAR-TOOLS/') && window.location.pathname.split('/').filter(Boolean).length > 0 && !window.location.pathname.endsWith('index.html');
      const rootPrefix = isSub ? '../' : './';

      mobileNav.innerHTML = `
        <ul class="mobile-nav-links">
          <li><a href="${rootPrefix}" class="mobile-nav-link"><i class="fas fa-home"></i> Home</a></li>
          <li><a href="${rootPrefix}#tools-directory" class="mobile-nav-link"><i class="fas fa-th"></i> All Tools Directory</a></li>
          <li><a href="${rootPrefix}docs/" class="mobile-nav-link"><i class="fas fa-book"></i> Documentation & Guides</a></li>
          <li><a href="${rootPrefix}about/" class="mobile-nav-link"><i class="fas fa-info-circle"></i> About Platform</a></li>
          <li><a href="${rootPrefix}contact/" class="mobile-nav-link"><i class="fas fa-envelope"></i> Contact Developer</a></li>
        </ul>
      `;
      header.appendChild(mobileNav);
    }

    if (mobileBtn && mobileNav) {
      mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = mobileNav.classList.toggle('open');
        mobileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        const icon = mobileBtn.querySelector('i');
        if (icon) {
          icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
        }
      });

      // Close menu on link click
      mobileNav.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
          mobileNav.classList.remove('open');
          mobileBtn.setAttribute('aria-expanded', 'false');
          const icon = mobileBtn.querySelector('i');
          if (icon) icon.className = 'fas fa-bars';
        }
      });

      // Close on click outside
      document.addEventListener('click', (e) => {
        if (mobileNav.classList.contains('open') && !mobileNav.contains(e.target) && !mobileBtn.contains(e.target)) {
          mobileNav.classList.remove('open');
          mobileBtn.setAttribute('aria-expanded', 'false');
          const icon = mobileBtn.querySelector('i');
          if (icon) icon.className = 'fas fa-bars';
        }
      });

      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
          mobileNav.classList.remove('open');
          mobileBtn.setAttribute('aria-expanded', 'false');
          const icon = mobileBtn.querySelector('i');
          if (icon) icon.className = 'fas fa-bars';
        }
      });
    }

    // 3. FAQ Accordion Logic
    document.querySelectorAll('.faq-trigger').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const parent = trigger.closest('.faq-item');
        if (!parent) return;
        const isOpen = parent.classList.contains('open');
        
        // Close all other FAQs in same accordion
        const accordion = parent.closest('.faq-accordion');
        if (accordion) {
          accordion.querySelectorAll('.faq-item').forEach((item) => {
            if (item !== parent) {
              item.classList.remove('open');
              const t = item.querySelector('.faq-trigger');
              if (t) t.setAttribute('aria-expanded', 'false');
            }
          });
        }

        parent.classList.toggle('open', !isOpen);
        trigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    });

    // 4. Dynamic Year
    document.querySelectorAll('.current-year').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });

    // 5. Toast Notification System Setup
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      toastContainer.setAttribute('aria-live', 'polite');
      toastContainer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(toastContainer);
    }
  }

  // Trigger init on DOM load or immediate if already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlatform);
  } else {
    initPlatform();
  }

  // Global Toast Function
  window.showToast = function (message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-triangle';
    if (type === 'warning') iconClass = 'fa-bell';

    toast.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  };

  // Global Copy Text Helper
  window.copyText = function (text, successMsg = 'Copied to clipboard!') {
    if (!text) {
      window.showToast('Nothing to copy', 'warning');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        window.showToast(successMsg, 'success');
      }).catch(() => {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  };

  function fallbackCopy(text, successMsg) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) {
        window.showToast(successMsg, 'success');
      } else {
        window.showToast('Could not copy automatically', 'error');
      }
    } catch (err) {
      window.showToast('Failed to copy', 'error');
    }
  }

  // Global Format Bytes Helper
  window.formatBytes = function (bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

})();
