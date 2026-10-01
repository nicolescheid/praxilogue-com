// Contact form: posts to the shared contact Worker (nicolescheid-contact),
// which emails the submission to Nic. The Worker allows praxilogue.com as an
// origin, so the JSON reply is readable here.
(() => {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = form.querySelector(".form-status");
  const button = form.querySelector('button[type="submit"]');
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = "form-status" + (kind ? " is-" + kind : "");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fields = {
      name: form.elements.name,
      email: form.elements.email,
      message: form.elements.message,
    };
    let firstBad = null;
    Object.entries(fields).forEach(([key, el]) => {
      const value = el.value.trim();
      const bad = !value || (key === "email" && !EMAIL_RE.test(value));
      el.setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad && !firstBad) firstBad = el;
    });
    if (firstBad) {
      setStatus("Please add your name, a valid email, and a message.", "error");
      firstBad.focus();
      return;
    }

    button.disabled = true;
    setStatus("Sending...");

    try {
      const res = await fetch(form.action, { method: "POST", body: new FormData(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Something went wrong. Please try again.");
      }
      form.reset();
      setStatus("Thanks, your message is on its way. I'll be in touch soon.", "ok");
    } catch (err) {
      const msg = err instanceof TypeError ? "Something went wrong. Please try again." : err.message;
      setStatus(msg, "error");
    } finally {
      button.disabled = false;
    }
  });
})();
