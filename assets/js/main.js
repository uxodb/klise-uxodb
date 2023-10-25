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
window.addEventListener('scroll', (event) => {
    if (window.scrollY < 500 && window.location.pathname !== "/") {
        document.getElementById('scrolltop').style.opacity='0';
        document.getElementById('scrolltop').style.visibility='hidden';
    } else if (window.scrollY > 500 && window.location.pathname !== "/") {
        document.getElementById('scrolltop').style.visibility='visible';
        document.getElementById('scrolltop').style.opacity=1;
    }
});

function toTop() {
    window.scrollTo({top: 0, behavior: 'smooth'});
};
// Table of Contents highlighting;
const anchors = document.querySelectorAll('h2');
const links = document.querySelectorAll('aside > nav > ul > li > a');
const list = document.querySelectorAll('aside > nav > ul > li');

document.addEventListener("DOMContentLoaded", (event) => {
    if (!links.length) {
        if (document.getElementById('toc-wrapper')) {
            document.getElementById('toc-wrapper').style.display='none';
        }
    }
});

window.addEventListener('scroll', (event) => {
    // if (typeof(anchors) != 'undefined' && anchors != null && typeof(links) != 'undefined' && links != null) {
    if (links.length != 0) {
        let scrollTop = window.scrollY;
      
        list.forEach((li,index) => {
          li.classList.remove('active');
        });
        links.forEach((link, index) => {
            link.classList.remove("active");
        });

        for (var i = anchors.length-1; i >= 0; i--) {
            if (scrollTop > anchors[i].offsetTop - 75) {
                links[i].classList.add('active');
                list[i].classList.add('active');
                break;
            }
        }
    }
});
