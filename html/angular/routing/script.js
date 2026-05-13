const checkpointData = {
  intro: {
    title: "Practical Checkpoint: Routing Meaning",
    verify: [
      "Open your Angular project folder in VS Code.",
      "Type this command in the terminal: ng serve",
      "Open http://localhost:4200 in the browser. Expected: the Angular app homepage should be visible without errors."
    ]
  },

  importance: {
    title: "Practical Checkpoint: App Still Runs",
    verify: [
      "Keep ng serve running in the terminal.",
      "Refresh http://localhost:4200. Expected: the app should still load normally.",
      "Check the browser console. Expected: no red routing errors should appear yet."
    ]
  },

  "mental-model": {
    title: "Practical Checkpoint: Trace the Flow",
    verify: [
      "Find the browser address bar and identify the current URL path.",
      "Find where routes are defined in your project, usually src/app/app.routes.ts.",
      "Find router-outlet in the app template. Expected: routed pages will appear there."
    ]
  },

  files: {
    title: "Practical Checkpoint: Required Routing Files",
    verify: [
      "Verify this file exists: src/app/app.routes.ts",
      "Verify this file exists: src/app/app.config.ts",
      "Verify this file exists: src/app/app.html or src/app/app.component.html depending on your Angular version."
    ]
  },

  setup: {
    title: "Practical Checkpoint: Pages Created and Routes Added",
    verify: [
      "Run: ng generate component pages/home",
      "Run: ng generate component pages/about, then pages/courses, then pages/contact.",
      "Verify these folders exist: src/app/pages/home, src/app/pages/about, src/app/pages/courses, src/app/pages/contact.",
      "Paste the routes into src/app/app.routes.ts and save the file.",
      "Open http://localhost:4200. Expected: no compile error should appear in the terminal."
    ]
  },

  outlet: {
    title: "Practical Checkpoint: Router Outlet Visible",
    verify: [
      "Open src/app/app.html or the root component HTML file.",
      "Add this tag in the main display area: <router-outlet></router-outlet>",
      "If using standalone Angular, verify RouterOutlet is imported in the root component imports array.",
      "Open http://localhost:4200. Expected: the selected route page should appear inside the layout."
    ]
  },

  links: {
    title: "Practical Checkpoint: Navigation Links Work",
    verify: [
      "Add routerLink links for Home, About, Courses, and Contact in the root template.",
      "If using standalone Angular, verify RouterLink is imported in the root component imports array.",
      "Open http://localhost:4200 and click About. Expected: URL changes to /about and About page appears.",
      "Click Courses. Expected: URL changes to /courses and Courses page appears without full page reload."
    ]
  },

  active: {
    title: "Practical Checkpoint: Active Link Highlight",
    verify: [
      "Add routerLinkActive=\"active-link\" to the navigation links.",
      "Add the .active-link CSS rule to the correct CSS file.",
      "If using standalone Angular, verify RouterLinkActive is imported in the root component imports array.",
      "Open http://localhost:4200/courses. Expected: the Courses link should be highlighted."
    ]
  },

  params: {
    title: "Practical Checkpoint: Route Parameter Works",
    verify: [
      "Run: ng generate component pages/student-detail",
      "Verify this folder exists: src/app/pages/student-detail",
      "Add this route: { path: 'students/:id', component: StudentDetail }",
      "Open http://localhost:4200/students/101. Expected: Student Detail page should open and show ID 101.",
      "Open http://localhost:4200/students/202. Expected: Student Detail page should show ID 202."
    ]
  },

  query: {
    title: "Practical Checkpoint: Query Parameters Work",
    verify: [
      "Add a link with queryParams for the Courses page.",
      "Open http://localhost:4200/courses?level=beginner&page=1",
      "Expected: Courses page should open without error.",
      "If you displayed the query values in the component, expected text should show level beginner and page 1."
    ]
  },

  redirect: {
    title: "Practical Checkpoint: Redirect Works",
    verify: [
      "Add a redirect route such as { path: 'old-courses', redirectTo: 'courses', pathMatch: 'full' }.",
      "Open http://localhost:4200/old-courses",
      "Expected: Angular should automatically move to /courses.",
      "Verify the Courses page is visible after redirect."
    ]
  },

  wildcard: {
    title: "Practical Checkpoint: 404 Page Works",
    verify: [
      "Run: ng generate component pages/not-found",
      "Verify this folder exists: src/app/pages/not-found",
      "Add wildcard route at the end only: { path: '**', component: NotFound }.",
      "Open http://localhost:4200/random-wrong-page. Expected: Not Found page should appear.",
      "Open http://localhost:4200/courses again. Expected: Courses page should still work."
    ]
  },

  lazy: {
    title: "Practical Checkpoint: Lazy Route Loads",
    verify: [
      "Convert at least one route to loadComponent or create a feature route using loadChildren.",
      "Save the route file and check the terminal. Expected: no compile errors.",
      "Open the lazy route URL in the browser. Expected: the page should appear normally.",
      "Open browser DevTools Network tab and refresh. Expected: a separate lazy chunk may be loaded for that route."
    ]
  },

  guards: {
    title: "Practical Checkpoint: Guard Protects Route",
    verify: [
      "Run: ng generate guard core/guards/auth-guard",
      "Verify the guard file was created inside src/app/core/guards.",
      "Add canActivate to the dashboard route.",
      "Clear localStorage token and open /dashboard. Expected: app redirects to /login.",
      "Set a demo token and open /dashboard again. Expected: dashboard route should open."
    ]
  },

  resolver: {
    title: "Practical Checkpoint: Resolver Provides Data",
    verify: [
      "Create a resolver file, for example src/app/core/resolvers/course-resolver.ts.",
      "Add resolve to the courses route.",
      "Read resolved data inside the Courses component using ActivatedRoute.",
      "Open http://localhost:4200/courses. Expected: course data should be available before the page displays."
    ]
  },

  hash: {
    title: "Practical Checkpoint: GitHub Pages Hash Routing",
    verify: [
      "Open src/app/app.config.ts.",
      "Add withHashLocation() to provideRouter(routes, withHashLocation()).",
      "Run: ng serve",
      "Open http://localhost:4200/#/courses. Expected: Courses page should open.",
      "For deployment to angular.learnwithchampak.live, verify the deploy command uses: ng deploy --base-href=/"
    ]
  },

  structure: {
    title: "Practical Checkpoint: Folder Structure Created",
    verify: [
      "Verify this folder exists: src/app/pages",
      "Verify this folder exists or create it: src/app/shared/components",
      "Verify this folder exists or create it: src/app/core/guards",
      "Verify this folder exists or create it: src/app/features",
      "Expected result: routing files, pages, shared components, and guards should not be mixed randomly in one folder."
    ]
  },

  expert: {
    title: "Practical Checkpoint: Expert Routing Features",
    verify: [
      "Create or identify a layout component such as MainLayout or DashboardLayout.",
      "Add at least one child route inside a parent route.",
      "Test the child route in browser. Expected: parent layout remains and child content changes.",
      "Add one programmatic navigation using Router.navigate(). Expected: button click moves to the target route."
    ]
  },

  mistakes: {
    title: "Practical Checkpoint: Debug Common Problems",
    verify: [
      "Temporarily open a wrong URL like /abcxyz. Expected: Not Found page should appear, not a blank screen.",
      "Click every nav link. Expected: no full page reload and no red console errors.",
      "Refresh a deep route. If hosting on GitHub Pages and refresh fails, enable hash routing.",
      "Verify wildcard route is the last route in app.routes.ts."
    ]
  },

  assignment: {
    title: "Final Practical Checkpoint: Complete Routed App",
    verify: [
      "All required page folders exist: home, about, courses, contact, student-detail, not-found.",
      "All required routes are present in src/app/app.routes.ts.",
      "Open http://localhost:4200 and test every navigation link.",
      "Open http://localhost:4200/students/101. Expected: Student Detail page shows 101.",
      "Run: ng deploy --base-href=/",
      "Open https://angular.learnwithchampak.live/. Expected: deployed Angular routing lesson/app loads correctly."
    ]
  }
};

function addSpeakTagsAndCheckpoints() {
      const sections = document.querySelectorAll("section.lesson");
      let speakNumber = 0;

      sections.forEach((section) => {
        const sectionId = section.id;

        if (!section.querySelector("[id^='speak']")) {
          const wrapper = document.createElement("div");
          wrapper.id = "speak" + speakNumber;
          wrapper.setAttribute("data-pp-speak-title", "Section " + (speakNumber + 1));

          const label = document.createElement("span");
          label.className = "speak-tag-label";
          label.textContent = "Speak tag: " + wrapper.id;

          while (section.firstChild) {
            wrapper.appendChild(section.firstChild);
          }

          section.appendChild(label);
          section.appendChild(wrapper);

          speakNumber++;
        }

        if (sectionId && checkpointData[sectionId] && !section.querySelector(".checkpoint")) {
          const checkpoint = document.createElement("div");
          checkpoint.className = "checkpoint";

          const heading = document.createElement("h3");
          heading.textContent = checkpointData[sectionId].title;

          const intro = document.createElement("p");
          intro.textContent = "Do these checks before continuing:";

          const list = document.createElement("div");
          list.className = "checkpoint-list";

          checkpointData[sectionId].verify.forEach((text) => {
            const label = document.createElement("label");
            label.className = "checkpoint-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.setAttribute("data-checkpoint", sectionId);

            const span = document.createElement("span");
            span.textContent = text;

            label.appendChild(checkbox);
            label.appendChild(span);
            list.appendChild(label);
          });

          const button = document.createElement("button");
          button.className = "checkpoint-continue";
          button.type = "button";
          button.disabled = true;
          button.textContent = "Continue";

          const status = document.createElement("div");
          status.className = "checkpoint-status";
          status.textContent = "Complete all practical checks to continue.";

          const boxes = list.querySelectorAll("input");

          boxes.forEach((box) => {
            box.addEventListener("change", () => {
              const allDone = Array.from(boxes).every((item) => item.checked);
              button.disabled = !allDone;
              status.textContent = allDone
                ? "Good. You can continue."
                : "Complete all practical checks to continue.";
            });
          });

          button.addEventListener("click", () => {
            const nextSection = section.nextElementSibling;
            if (nextSection) {
              nextSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
            }
          });

          checkpoint.appendChild(heading);
          checkpoint.appendChild(intro);
          checkpoint.appendChild(list);
          checkpoint.appendChild(button);
          checkpoint.appendChild(status);

          const speakWrapper = section.querySelector("[id^='speak']");
          speakWrapper.appendChild(checkpoint);
        }
      });
    }

    function activateCopyButtons() {
      const copyButtons = document.querySelectorAll(".copy-btn");

      copyButtons.forEach((button) => {
        button.addEventListener("click", async () => {
          const code = button.nextElementSibling.innerText;

          try {
            await navigator.clipboard.writeText(code);
            const oldText = button.innerText;
            button.innerText = "Copied";
            setTimeout(() => {
              button.innerText = oldText;
            }, 1200);
          } catch (error) {
            alert("Copy failed. Please select and copy manually.");
          }
        });
      });
    }

    addSpeakTagsAndCheckpoints();
    activateCopyButtons();
