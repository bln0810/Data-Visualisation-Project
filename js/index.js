// Hamburger menu toggle functionality
document.addEventListener("DOMContentLoaded", function() {
    const hamburgerBtn = document.querySelector(".hamburger-btn");
    const navMenu = document.querySelector(".navbar ul");
    const navLinks = document.querySelectorAll(".navbar a");

    // Toggle menu on hamburger button click
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener("click", function() {
            navMenu.classList.toggle("active");
        });
    }

    // Close menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener("click", function() {
            navMenu.classList.remove("active");
        });
    });

    // Close menu when clicking outside
    document.addEventListener("click", function(event) {
        const isClickInsideNav = event.target.closest(".navbar");
        if (!isClickInsideNav && navMenu && navMenu.classList.contains("active")) {
            navMenu.classList.remove("active");
        }
    });
});