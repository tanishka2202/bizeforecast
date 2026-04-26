document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", (e) => {
    const email = form.querySelector("input[name='email']").value.trim();
    const password = form.querySelector("input[name='password']").value.trim();

    if (!email || !password) {
      alert("⚠ Please enter both email and password.");
      e.preventDefault();
      return;
    }

    // DO NOT prevent default if validation passes
    // Let Flask handle login
  });
});
