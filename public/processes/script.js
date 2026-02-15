document.addEventListener('DOMContentLoaded', () => {
	const loginForm = document.querySelector('form[data-form="login"]');

	// If a login form exists, intercept submit and redirect to the sample profile.
	if (loginForm) {
		loginForm.addEventListener('submit', (e) => {
			e.preventDefault();

			// Save a simple session flag so refreshing login won't show the form again.
			const emailInput = document.getElementById('loginEmail');
			const email = emailInput ? emailInput.value.trim() : '';
			const username = email ? email.split('@')[0] : 'user';
			try {
				sessionStorage.setItem('animo_logged_in', 'true');
				sessionStorage.setItem('animo_user', username);
			} catch (err) {
				/* sessionStorage may be unavailable in some contexts; ignore */
			}

			// Redirect to profile page (same folder as login.html)
			window.location.href = 'profile.html';
		});
	}
});

