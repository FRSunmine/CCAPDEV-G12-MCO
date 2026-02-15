document.addEventListener('DOMContentLoaded', () => {
  // Display stored username if available
  try {
    const user = sessionStorage.getItem('animo_user');
    if (user) {
      const nameEl = document.getElementById('profile-name');
      if (nameEl) nameEl.textContent = user;
      const metaEl = document.getElementById('profile-meta');
      if (metaEl) metaEl.textContent = `@${user} • Member since 2024`;
    }
  } catch (err) {
    // ignore
  }

  // Logout button clears the simple session flag and navigates to login
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      try {
        sessionStorage.removeItem('animo_logged_in');
        sessionStorage.removeItem('animo_user');
      } catch (err) {
        // ignore
      }
      // Send user back to login page
      window.location.href = 'login.html';
    });
  }
});