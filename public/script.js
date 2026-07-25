(() => {
  const scenes = Array.from(document.querySelectorAll(".scene[data-index]"));
  const navItems = Array.from(document.querySelectorAll(".scene-nav-item"));
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Shades of blue, one per scene: cyan-leaning to indigo-leaning.
  const HUES = { "00": 200, "01": 220, "02": 210, "03": 195, "04": 235 };

  let activeIndex = "00";

  function setActive(index) {
    if (index === activeIndex || !HUES.hasOwnProperty(index)) return;
    activeIndex = index;
    navItems.forEach((btn) => {
      btn.setAttribute("aria-current", btn.dataset.target === index ? "true" : "false");
    });
    root.style.setProperty("--hue", HUES[index]);
  }

  function goToScene(index) {
    const target = scenes.find((s) => s.dataset.index === index);
    if (!target) return;
    setActive(index);
    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  // Click / keyboard navigation
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => goToScene(btn.dataset.target));
  });
  document.querySelectorAll("[data-target]:not(.scene-nav-item)").forEach((el) => {
    el.addEventListener("click", () => goToScene(el.dataset.target));
  });
  document.querySelector(".mark").addEventListener("click", (e) => {
    e.preventDefault();
    goToScene("00");
  });

  window.addEventListener("keydown", (e) => {
    const order = scenes.map((s) => s.dataset.index);
    const pos = order.indexOf(activeIndex);
    if (["ArrowDown", "ArrowRight", "PageDown"].includes(e.key)) {
      e.preventDefault();
      goToScene(order[Math.min(pos + 1, order.length - 1)]);
    } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
      e.preventDefault();
      goToScene(order[Math.max(pos - 1, 0)]);
    } else if (e.key === "Home") {
      e.preventDefault();
      goToScene(order[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      goToScene(order[order.length - 1]);
    }
  });

  // Track which scene is active — drives nav highlighting and the hue shift.
  if ("IntersectionObserver" in window) {
    const sceneObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.dataset.index);
        });
      },
      { threshold: 0, rootMargin: "-45% 0px -45% 0px" }
    );
    scenes.forEach((el) => sceneObserver.observe(el));
  }

  // Reveal-on-scroll for scene content.
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in-view"));
  }

  // Magnetic hover on project rows — skip for touch/coarse pointers.
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!prefersReducedMotion && hasFinePointer) {
    document.querySelectorAll(".project").forEach((row) => {
      const name = row.querySelector(".project-name, .project-name--static");
      if (!name) return;
      row.addEventListener("mousemove", (e) => {
        const rect = row.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
        name.style.transform = `translate(${dx * 6}px, 0)`;
      });
      row.addEventListener("mouseleave", () => {
        name.style.transform = "";
      });
    });
  }
})();
