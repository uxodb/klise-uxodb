(() => {
  // Theme switch
  const body = document.body;
  const lamp = document.getElementById("mode");

  const toggleTheme = (state) => {
    if (state === "dark") {
      localStorage.setItem("theme", "light");
      body.removeAttribute("data-theme");
    } else if (state === "light") {
      localStorage.setItem("theme", "dark");
      body.setAttribute("data-theme", "dark");
    } else {
      initTheme(state);
    }
  };

  lamp.addEventListener("click", () =>
    toggleTheme(localStorage.getItem("theme"))
  );

  // Blur the content when the menu is open
  const cbox = document.getElementById("menu-trigger");

  cbox.addEventListener("change", function () {
    const area = document.querySelector(".wrapper");
    this.checked
      ? area.classList.add("blurry")
      : area.classList.remove("blurry");
  });
})();


// Remember scrollposition after reload
document.addEventListener("DOMContentLoaded", function (event) {
    var scrollpos = sessionStorage.getItem('scrollpos');
    var page = sessionStorage.getItem('page');
    if (scrollpos && page === window.document.URL) {
        window.scrollTo(0, scrollpos);
        sessionStorage.removeItem('scrollpos');
    }
});
window.addEventListener("beforeunload", function (e) {
    sessionStorage.setItem('scrollpos', window.scrollY);
    sessionStorage.setItem('page', window.document.URL);
});

// Scroll to top button
document.addEventListener("scroll", function (event) {
    if (window.scrollY < 400) {
        document.getElementById('scrolltop').style.opacity='0';
        document.getElementById('scrolltop').style.visibility='hidden';
    } else {
        document.getElementById('scrolltop').style.visibility='visible';
        document.getElementById('scrolltop').style.opacity='1';
    }
});
