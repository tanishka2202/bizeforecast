document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", (e) => {
    const name = form.querySelector("input[name='firstName']").value.trim();
    const email = form.querySelector("input[name='email']").value.trim();
    const password = form.querySelector("input[name='password']").value.trim();
    const confirmPassword = form.querySelector("input[name='confirmPassword']").value.trim();

    // Check empty fields
    if (!name || !email || !password || !confirmPassword) {
      alert("⚠ Please fill all fields.");
      e.preventDefault();
      return;
    }

    // Email validation
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/;
    if (!email.match(emailPattern)) {
      alert("⚠ Enter a valid email address.");
      e.preventDefault();
      return;
    }

    // Password length
    // Strong password validation
const strongPassword =
  /^(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;

if (!strongPassword.test(password)) {
  alert(
    "⚠ Password must contain:\n" +
    "- At least 6 characters\n" +  
    "- 1 number\n" +
    "- 1 special character (@$!%*?&)"
  );
  e.preventDefault();
  return;
}


    // Password match
    if (password !== confirmPassword) {
      alert("⚠ Passwords do not match.");
      e.preventDefault();
      return;
    }

    // IMPORTANT:
    // No preventDefault() here
    // Let Flask handle submission and redirect
  });
});
