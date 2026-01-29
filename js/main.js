import "./game.js";

class Portfolio {
  constructor() {
    this.currentSlide = 0;
    this.totalSlides = 5;
    this.wheelTimeout = null;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.isMobile = window.innerWidth <= 768;
    this.init();
  }

  init() {
    this.initViewportHeight();
    this.initCursor();
    this.initParticles();
    this.initSlider();
    this.initTouchSwipe();
    this.initThemeSwitcher();
    this.initFloatingMenu();
    this.initGameModal();
    this.initAgeCounter();
    this.initResizeHandler();
    this.initTypewriter();
    this.initTiltEffect();
    this.initEmailCopy();
    this.unregisterServiceWorker();
  }

  unregisterServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }

  initEmailCopy() {
    const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
    emailLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const email = link.getAttribute("href").replace("mailto:", "");
        navigator.clipboard
          .writeText(email)
          .then(() => {
            this.showToast("Email copied to clipboard!");
          })
          .catch((err) => {
            console.error("Failed to copy email: ", err);
            window.location.href = link.href; // Fallback to default mailto behavior
          });
      });
    });
  }

  showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  initTiltEffect() {
    if (this.isMobile) return;

    const cards = document.querySelectorAll(
      ".project-card, .project-card-horizontal, .tool-category",
    );

    cards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5; // Max 5deg rotation
        const rotateY = ((x - centerX) / centerX) * 5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform =
          "perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)";
      });
    });
  }

  // Fix for mobile viewport height (100vh issue with address bar)
  initViewportHeight() {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVH();
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", () => {
      setTimeout(setVH, 100);
    });
  }

  initResizeHandler() {
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.isMobile = window.innerWidth <= 768;
      }, 100);
    });
  }

  initAgeCounter() {
    const ageDisplay = document.getElementById("ageDisplay");
    if (!ageDisplay) return;

    // Birth date: January 29, 2010 at 7:10 PM
    const birthDate = new Date(2010, 0, 29, 19, 10, 0, 0);
    const msPerYear = 1000 * 60 * 60 * 24 * 365.25;

    const updateAge = () => {
      const now = new Date();
      const ageInYears = (now - birthDate) / msPerYear;
      ageDisplay.textContent = ageInYears.toFixed(9);
    };

    updateAge();
    setInterval(updateAge, 50);
  }

  initCursor() {
    // Skip cursor on touch devices
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
      return;
    }

    const cursorDot = document.querySelector("[data-cursor-dot]");
    const cursorOutline = document.querySelector("[data-cursor-outline]");

    if (!cursorDot || !cursorOutline) return;

    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;

    function updateCursorPosition(e) {
      cursorX = e.clientX;
      cursorY = e.clientY;
    }

    function animateCursor() {
      cursorDot.style.left = `${cursorX}px`;
      cursorDot.style.top = `${cursorY}px`;
      cursorDot.style.opacity = "1";

      cursorOutline.style.left = `${cursorX}px`;
      cursorOutline.style.top = `${cursorY}px`;
      cursorOutline.style.opacity = "1";

      requestAnimationFrame(animateCursor);
    }

    window.addEventListener("mousemove", updateCursorPosition);
    animateCursor();

    const magnetics = document.querySelectorAll(".magnetic");
    magnetics.forEach((m) => {
      m.addEventListener("mousemove", (e) => {
        const pos = m.getBoundingClientRect();
        const x = e.clientX - pos.left - pos.width / 2;
        const y = e.clientY - pos.top - pos.height / 2;
        m.style.transform = `translate(${x * 0.3}px, ${y * 0.5}px)`;
      });
      m.addEventListener("mouseleave", () => {
        m.style.transform = `translate(0px, 0px)`;
      });
    });
  }

  initParticles() {
    const particleContainer = document.getElementById("particles");
    if (!particleContainer) return;

    // Reduce particles on mobile for performance
    const particleCount = this.isMobile ? 15 : 30;

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div");
      p.classList.add("particle");
      const size = Math.random() * 4;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = Math.random() * 100 + "vw";
      p.style.top = Math.random() * 100 + "vh";
      p.style.opacity = Math.random() * 0.5;
      particleContainer.appendChild(p);
      gsap.to(p, {
        y: Math.random() * 100 - 50,
        x: Math.random() * 100 - 50,
        duration: 10 + Math.random() * 20,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }

  initTypewriter() {
    const roles = ["Dev", "Designer", "Creator"];
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typeSpeed = 100;
    const deleteSpeed = 50;
    const delayBetween = 2000;
    const element = document.querySelector(".typewriter-text");

    if (!element) return;

    const type = () => {
      const currentRole = roles[roleIndex];

      if (isDeleting) {
        element.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
      } else {
        element.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
      }

      let speed = isDeleting ? deleteSpeed : typeSpeed;

      if (!isDeleting && charIndex === currentRole.length) {
        speed = delayBetween;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        speed = 500;
      }

      setTimeout(type, speed);
    };

    setTimeout(type, 1000);
  }

  initSlider() {
    this.track = document.getElementById("slider-track");
    this.dots = document.querySelectorAll(".dot");
    this.progressBar = document.getElementById("progressBar");

    if (!this.track) return;

    // See My Work button scroll
    const seeWorkBtn = document.getElementById("seeWorkBtn");
    if (seeWorkBtn) {
      seeWorkBtn.addEventListener("click", () => {
        this.currentSlide = 3; // Go to Projects slide
        this.updateSlider();
      });
    }

    const nextBtn = document.getElementById("nextBtn");
    const prevBtn = document.getElementById("prevBtn");

    if (nextBtn) {
      nextBtn.onclick = () => {
        if (this.currentSlide < this.totalSlides - 1) {
          this.currentSlide++;
          this.updateSlider();
        }
      };
    }

    if (prevBtn) {
      prevBtn.onclick = () => {
        if (this.currentSlide > 0) {
          this.currentSlide--;
          this.updateSlider();
        }
      };
    }

    this.dots.forEach((d, i) => {
      d.onclick = () => {
        this.currentSlide = i;
        this.updateSlider();
      };
    });

    // Wheel navigation (desktop only)
    document.addEventListener("wheel", (e) => {
      if (this.isMobile) return;

      clearTimeout(this.wheelTimeout);
      this.wheelTimeout = setTimeout(() => {
        if (e.deltaY > 0 && this.currentSlide < this.totalSlides - 1) {
          this.currentSlide++;
        } else if (e.deltaY < 0 && this.currentSlide > 0) {
          this.currentSlide--;
        }
        this.updateSlider();
      }, 50);
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (this.currentSlide < this.totalSlides - 1) {
          this.currentSlide++;
          this.updateSlider();
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (this.currentSlide > 0) {
          this.currentSlide--;
          this.updateSlider();
        }
      }
    });

    this.updateSlider();
  }

  initTouchSwipe() {
    const viewport = document.getElementById("slider-viewport");
    if (!viewport) return;

    let startX = 0;
    let startY = 0;
    let distX = 0;
    let distY = 0;
    const threshold = 50; // Minimum distance for swipe
    const restraint = 100; // Maximum perpendicular distance
    const allowedTime = 500; // Maximum time for swipe
    let startTime = 0;

    viewport.addEventListener(
      "touchstart",
      (e) => {
        const touch = e.changedTouches[0];
        startX = touch.pageX;
        startY = touch.pageY;
        startTime = new Date().getTime();
      },
      { passive: true },
    );

    viewport.addEventListener(
      "touchend",
      (e) => {
        const touch = e.changedTouches[0];
        distX = touch.pageX - startX;
        distY = touch.pageY - startY;
        const elapsedTime = new Date().getTime() - startTime;

        if (elapsedTime <= allowedTime) {
          // Horizontal swipe
          if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
            if (distX < 0 && this.currentSlide < this.totalSlides - 1) {
              // Swipe left - next slide
              this.currentSlide++;
              this.updateSlider();
            } else if (distX > 0 && this.currentSlide > 0) {
              // Swipe right - previous slide
              this.currentSlide--;
              this.updateSlider();
            }
          }
        }
      },
      { passive: true },
    );
  }

  updateSlider() {
    this.track.style.transform = `translateX(-${this.currentSlide * 20}%)`;
    this.progressBar.style.width = `${(this.currentSlide / (this.totalSlides - 1)) * 100}%`;
    this.dots.forEach((d, i) =>
      d.classList.toggle("active", i === this.currentSlide),
    );
    this.runAnimations(this.currentSlide);
  }

  runAnimations(slideIndex) {
    if (slideIndex === 0) {
      gsap.fromTo(
        ".gsap-hero",
        {
          y: 50,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.2,
        },
      );
    }

    if (slideIndex === 1) {
      gsap.fromTo(
        ".gsap-about-left",
        {
          x: -50,
          opacity: 0,
        },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
        },
      );
      gsap.fromTo(
        ".gsap-about-right",
        {
          x: 50,
          opacity: 0,
        },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          delay: 0.2,
        },
      );
    }

    if (slideIndex === 3) {
      gsap.fromTo(
        ".project-card",
        {
          y: 50,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
        },
      );
    }
  }

  initThemeSwitcher() {
    const themeSwitch = document.querySelector(".theme-switch");
    if (!themeSwitch) return;

    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    this.updateThemeIcon(savedTheme);

    themeSwitch.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";

      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      this.updateThemeIcon(newTheme);
    });
  }

  updateThemeIcon(theme) {
    const svg = document.querySelector(".theme-switch svg");
    if (!svg) return;

    if (theme === "dark") {
      // Sun icon for dark mode (to switch to light)
      svg.innerHTML = `
        <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      `;
    } else {
      // Moon icon for light mode (to switch to dark)
      svg.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    }
  }

  initFloatingMenu() {
    const resumeBtn = document.querySelector('[data-action="resume"]');
    if (resumeBtn) {
      resumeBtn.addEventListener("click", () => {
        console.log("Download resume");
      });
    }

    const gameBtn = document.querySelector('[data-action="game"]');
    if (gameBtn) {
      gameBtn.addEventListener("click", () => {
        const gameModal = document.querySelector(".game-modal");
        if (gameModal) {
          gameModal.classList.add("active");
        }
      });
    }
  }

  initGameModal() {
    const gameModal = document.querySelector(".game-modal");
    const closeBtn = document.querySelector(".game-close");

    if (!gameModal || !closeBtn) return;

    closeBtn.addEventListener("click", () => {
      gameModal.classList.remove("active");
    });

    gameModal.addEventListener("click", (e) => {
      if (e.target === gameModal) {
        gameModal.classList.remove("active");
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && gameModal.classList.contains("active")) {
        gameModal.classList.remove("active");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.portfolio = new Portfolio();
});

export default Portfolio;
