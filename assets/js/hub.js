
      (function () {
        "use strict";

        var editors = [
          {
            id: "python",
            name: "Python Editor",
            icon: "🐍",
            category: "code",
            categoryLabel: "Code",
            keywords: ["python", "coding", "practice", "logic", "programming"],
            use: "Python lessons, exercises, live demos",
            tag: "Most used",
            description:
              "A ready-to-use Python practice environment for lessons, quick experiments and guided classroom coding.",
            src: "https://editor.learnwithchampak.live/python-starter/editor/super/?tmode=1",
          },
          {
            id: "javascript",
            name: "JavaScript Editor",
            icon: "🟨",
            category: "code",
            categoryLabel: "Code",
            keywords: ["javascript", "js", "frontend", "web", "scripting"],
            use: "JavaScript concepts, browser logic, examples",
            tag: "Frontend",
            description:
              "A JavaScript playground for scripting, browser logic and interactive experiments.",
            src: "https://editor.learnwithchampak.live/java-script/editor/",
          },
          {
            id: "sql",
            name: "SQL Editor",
            icon: "🧱",
            category: "database",
            categoryLabel: "Database",
            keywords: ["sql", "database", "queries", "tables", "relational"],
            use: "SQL practice, query writing, joins and filters",
            tag: "Database",
            description:
              "A practical SQL workspace for teaching queries, tables, joins, filtering and structured database thinking.",
            src: "https://editor.learnwithchampak.live/sql/premium/",
          },
          {
            id: "html-preview",
            name: "HTML Preview",
            icon: "🖥️",
            category: "code",
            categoryLabel: "Code",
            keywords: ["html", "preview", "render", "webpage", "browser"],
            use: "Previewing markup output and visual examples",
            tag: "Visual",
            description:
              "A visual preview environment for seeing how HTML behaves in a browser-style presentation.",
            src: "https://www.learnwithchampak.live/2026/01/programmers-picnic-html-preview.html",
          },
          {
            id: "html-editor",
            name: "HTML Editor",
            icon: "🧾",
            category: "code",
            categoryLabel: "Code",
            keywords: ["html", "editor", "markup", "web design", "practice"],
            use: "HTML writing, examples and page building",
            tag: "Markup",
            description:
              "A dedicated HTML editing workspace for writing markup, exploring structure and building web examples.",
            src: "https://editor.learnwithchampak.live/samples/html/editor/",
          },
          {
            id: "json-editor",
            name: "JSON Editor",
            icon: "🧩",
            category: "code",
            categoryLabel: "Code",
            keywords: ["json", "editor", "data", "objects", "arrays", "schema"],
            use: "JSON practice, structured data editing and formatting",
            tag: "JSON",
            description:
              "A JSON editing workspace for creating, formatting and experimenting with structured data.",
            src: "https://editor.learnwithchampak.live/samples/html/editor/json/",
          },
          {
            id: "whiteboard",
            name: "Whiteboard",
            icon: "📝",
            category: "classroom",
            categoryLabel: "Classroom",
            keywords: ["whiteboard", "draw", "teaching", "classroom", "notes"],
            use: "Teaching, explaining concepts and visual collaboration",
            tag: "Teaching",
            description:
              "An interactive whiteboard for teaching, sketching ideas and explaining concepts visually.",
            src: "https://editor.learnwithchampak.live/whiteboard/",
          },
          {
            id: "room",
            name: "Room",
            icon: "🏫",
            category: "classroom",
            categoryLabel: "Classroom",
            keywords: ["room", "classroom", "meeting", "session", "teaching"],
            use: "Virtual classroom and shared learning sessions",
            tag: "Sessions",
            description:
              "A room-style learning space for running sessions, sharing ideas and teaching interactively.",
            src: "https://editor.learnwithchampak.live/room/",
          },
          {
            id: "search",
            name: "Search",
            icon: "🔎",
            category: "tools",
            categoryLabel: "Tools",
            keywords: ["search", "find", "blog", "site search", "content"],
            use: "Finding lessons, pages, tools and blog content",
            tag: "Discover",
            description:
              "A search experience for quickly finding lessons, tools and useful content across your ecosystem.",
            src: "https://www.learnwithchampak.live/2026/03/Programmers%20Picnic%20Champak%20Search.html",
          },
          {
            id: "api",
            name: "API Studio",
            icon: "🌐",
            category: "tools",
            categoryLabel: "Tools",
            keywords: ["api", "rest", "json", "http", "request", "response"],
            use: "Testing APIs, inspecting responses and experimenting with requests",
            tag: "API",
            description:
              "A browser-based API lab for building requests, testing endpoints and examining responses.",
            src: "https://editor.learnwithchampak.live/api/",
          },
          {
            id: "face-ai",
            name: "Face AI Demo",
            icon: "🧠",
            category: "tools",
            categoryLabel: "Tools",
            keywords: ["face", "ai", "vision", "camera", "demo"],
            use: "Face-related experiments and browser demo usage",
            tag: "Vision",
            description:
              "A face demo tool for browser-based experiments and interactive testing.",
            src: "https://editor.learnwithchampak.live/samples/face/",
          },
          {
            id: "live-class",
            name: "Live Class",
            icon: "🎥",
            category: "tools",
            categoryLabel: "Tools",
            keywords: ["zoom", "class", "live", "meeting", "session"],
            use: "Join live teaching sessions and scheduled classes",
            tag: "Live",
            description:
              "Join the live Zoom classroom session with one click from the editor hub.",
            src: "https://us04web.zoom.us/j/4428355179?pwd=yCZrJtx41cUAxDyApDM9eSrre1GSXe.1",
          },
          {
            id: "mongo",
            name: "MongoDB Queries",
            icon: "🍃",
            category: "database",
            categoryLabel: "Database",
            keywords: ["mongodb", "mongo", "nosql", "queries", "collections"],
            use: "MongoDB fundamentals and query practice",
            tag: "NoSQL",
            description:
              "A MongoDB query experience for demonstrating collections, filters and NoSQL-style workflows.",
            src: "https://www.learnwithchampak.live/2026/02/programmers-picnic-mongodb-queries.html",
          },
        ];

        var favoriteStorageKey = "pp_editor_hub_favorites_v2";
        var recentStorageKey = "pp_editor_hub_recent_v2";

        var state = {
          activeId: "python",
          search: "",
          filter: "all",
          favorites: loadArray(favoriteStorageKey),
          recent: loadArray(recentStorageKey),
        };

        var toolList = document.getElementById("toolList");
        var quickLinks = document.getElementById("quickLinks");
        var chips = document.getElementById("chips");
        var searchBox = document.getElementById("searchBox");
        var frame = document.getElementById("editorFrame");
        var browserUrl = document.getElementById("browserUrl");
        var viewerName = document.getElementById("viewerName");
        var viewerDesc = document.getElementById("viewerDesc");
        var viewerCategory = document.getElementById("viewerCategory");
        var viewerKeywords = document.getElementById("viewerKeywords");
        var viewerUse = document.getElementById("viewerUse");
        var viewerSrcText = document.getElementById("viewerSrcText");
        var viewerSrcLink = document.getElementById("viewerSrcLink");
        var viewerPill = document.getElementById("viewerPill");
        var btnOpenCurrent = document.getElementById("btnOpenCurrent");
        var btnOpenCurrentTop = document.getElementById("btnOpenCurrentTop");
        var btnReload = document.getElementById("btnReload");
        var btnCopySrc = document.getElementById("btnCopySrc");
        var btnCopyShare = document.getElementById("btnCopyShare");
        var sideNav = document.getElementById("sideNav");
        var sideToggle = document.getElementById("sideToggle");
        var btnLiveClass = document.getElementById("btnLiveClass");
        var btnJoinLiveClass = document.getElementById("btnJoinLiveClass");
        var btnPreviewLiveClass = document.getElementById(
          "btnPreviewLiveClass",
        );
        var btnCopyLiveClass = document.getElementById("btnCopyLiveClass");

        var liveModal = document.getElementById("liveModal");
        var liveModalClose = document.getElementById("liveModalClose");
        var liveModalBackdrop = document.getElementById("liveModalBackdrop");
        var btnModalJoinLive = document.getElementById("btnModalJoinLive");
        var btnModalPreviewLive = document.getElementById(
          "btnModalPreviewLive",
        );
        var btnModalCopyLive = document.getElementById("btnModalCopyLive");

        document.getElementById("year").textContent = new Date().getFullYear();

        function loadArray(key) {
          try {
            var raw = localStorage.getItem(key);
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
          } catch (err) {
            return [];
          }
        }

        function saveArray(key, value) {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch (err) {}
        }

        function escapeHtml(str) {
          return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        function getById(id) {
          return editors.find(function (item) {
            return item.id === id;
          });
        }

        function getActive() {
          return getById(state.activeId) || editors[0];
        }

        function isFavorite(id) {
          return state.favorites.indexOf(id) !== -1;
        }

        function touchRecent(id) {
          state.recent = state.recent.filter(function (x) {
            return x !== id;
          });
          state.recent.unshift(id);
          state.recent = state.recent.slice(0, 6);
          saveArray(recentStorageKey, state.recent);
        }

        function toggleFavorite(id) {
          if (isFavorite(id)) {
            state.favorites = state.favorites.filter(function (x) {
              return x !== id;
            });
            toast("Removed from favorites");
          } else {
            state.favorites.unshift(id);
            state.favorites = state.favorites.slice(0, 10);
            toast("Added to favorites");
          }
          saveArray(favoriteStorageKey, state.favorites);
          renderChips();
          renderQuickLinks();
          renderTools();
        }

        function getShareUrl(item) {
          var cleanBase = window.location.href.split("#")[0];
          return cleanBase + "#tool=" + encodeURIComponent(item.id);
        }

        function matches(item) {
          var q = state.search.trim().toLowerCase();
          var okFilter =
            state.filter === "all" ? true : item.category === state.filter;
          if (!okFilter) return false;
          if (!q) return true;

          var hay = [
            item.name,
            item.categoryLabel,
            item.description,
            item.use,
            item.tag,
            item.src,
            item.keywords.join(" "),
          ]
            .join(" ")
            .toLowerCase();

          return hay.indexOf(q) !== -1;
        }

        function getVisibleEditors() {
          var visible = editors.filter(matches);

          visible.sort(function (a, b) {
            var af = isFavorite(a.id) ? 1 : 0;
            var bf = isFavorite(b.id) ? 1 : 0;
            if (af !== bf) return bf - af;

            var ar = state.recent.indexOf(a.id);
            var br = state.recent.indexOf(b.id);
            ar = ar === -1 ? 999 : ar;
            br = br === -1 ? 999 : br;
            if (ar !== br) return ar - br;

            return a.name.localeCompare(b.name);
          });

          return visible;
        }

        function renderChips() {
          var favoriteEditors = editors.filter(function (item) {
            return isFavorite(item.id);
          });

          var recentEditors = state.recent
            .map(function (id) {
              return getById(id);
            })
            .filter(Boolean);

          var featured = []
            .concat(favoriteEditors)
            .concat(recentEditors)
            .filter(function (item, index, arr) {
              return (
                arr.findIndex(function (x) {
                  return x.id === item.id;
                }) === index
              );
            })
            .slice(0, 8);

          if (!featured.length) {
            featured = editors.slice(0, 6);
          }

          chips.innerHTML = featured
            .map(function (item) {
              var active = item.id === state.activeId ? " active" : "";
              return (
                '<button class="chip' +
                active +
                '" type="button" data-chip="' +
                escapeHtml(item.id) +
                '">' +
                item.icon +
                " " +
                escapeHtml(item.name) +
                (isFavorite(item.id) ? " ★" : "") +
                "</button>"
              );
            })
            .join("");

          Array.prototype.forEach.call(
            chips.querySelectorAll("[data-chip]"),
            function (btn) {
              btn.addEventListener("click", function () {
                state.activeId = btn.getAttribute("data-chip");
                updateViewer();
                renderChips();
                renderTools();
              });
            },
          );
        }

        function renderQuickLinks() {
          var quickItems = editors.filter(function (item) {
            return isFavorite(item.id);
          });

          if (quickItems.length < 6) {
            var recentItems = state.recent
              .map(function (id) {
                return getById(id);
              })
              .filter(Boolean);

            recentItems.forEach(function (item) {
              if (
                quickItems.length < 6 &&
                !quickItems.some(function (x) {
                  return x.id === item.id;
                })
              ) {
                quickItems.push(item);
              }
            });
          }

          if (quickItems.length < 6) {
            editors.forEach(function (item) {
              if (
                quickItems.length < 6 &&
                !quickItems.some(function (x) {
                  return x.id === item.id;
                })
              ) {
                quickItems.push(item);
              }
            });
          }

          quickLinks.innerHTML = quickItems
            .slice(0, 6)
            .map(function (item) {
              return (
                '<button class="quick-link" type="button" data-quick="' +
                escapeHtml(item.id) +
                '" title="' +
                escapeHtml(item.name) +
                '">' +
                '<div class="qicon" aria-hidden="true">' +
                item.icon +
                "</div>" +
                '<div class="qtext">' +
                "<strong>" +
                escapeHtml(item.name) +
                "</strong>" +
                "<span>" +
                escapeHtml(
                  item.tag + (isFavorite(item.id) ? " • Favorite" : ""),
                ) +
                "</span>" +
                "</div>" +
                "</button>"
              );
            })
            .join("");

          Array.prototype.forEach.call(
            quickLinks.querySelectorAll("[data-quick]"),
            function (btn) {
              btn.addEventListener("click", function () {
                state.activeId = btn.getAttribute("data-quick");
                updateViewer();
                renderChips();
                renderTools();
                document
                  .getElementById("viewer")
                  .scrollIntoView({ behavior: "smooth", block: "start" });
              });
            },
          );
        }

        function renderTools() {
          var visible = getVisibleEditors();

          if (!visible.length) {
            toolList.innerHTML =
              '<div class="empty-state">' +
              "<strong>No tools match your current search.</strong><br />" +
              "Try a broader keyword like Python, SQL, HTML, API or classroom." +
              "</div>";
            return;
          }

          toolList.innerHTML = visible
            .map(function (item) {
              var active = item.id === state.activeId ? " active" : "";
              var starred = isFavorite(item.id);
              var favClass = starred ? " starred" : "";
              return (
                '<article class="tool-card' +
                active +
                '" data-id="' +
                escapeHtml(item.id) +
                '">' +
                '<div class="tool-top">' +
                '<div class="tool-icon">' +
                item.icon +
                "</div>" +
                '<div class="tool-copy">' +
                "<h4>" +
                escapeHtml(item.name) +
                "</h4>" +
                "<p>" +
                escapeHtml(item.description) +
                "</p>" +
                "</div>" +
                "</div>" +
                '<div class="tool-meta">' +
                '<span class="tag">' +
                escapeHtml(item.categoryLabel) +
                "</span>" +
                '<span class="tag">' +
                escapeHtml(item.tag) +
                "</span>" +
                (starred
                  ? '<span class="tag favorite-tag">★ Favorite</span>'
                  : "") +
                "</div>" +
                '<div class="tool-actions">' +
                '<button class="tool-mini-btn" type="button" data-open="' +
                escapeHtml(item.id) +
                '">Open here</button>' +
                '<button class="tool-mini-btn" type="button" data-copy="' +
                escapeHtml(item.id) +
                '">Copy URL</button>' +
                '<button class="tool-mini-btn' +
                favClass +
                '" type="button" data-favorite="' +
                escapeHtml(item.id) +
                '">' +
                (starred ? "★ Favorited" : "☆ Favorite") +
                "</button>" +
                '<a class="tool-mini-btn" href="' +
                escapeHtml(item.src) +
                '" target="_blank" rel="noopener">Fullscreen</a>' +
                "</div>" +
                "</article>"
              );
            })
            .join("");

          Array.prototype.forEach.call(
            toolList.querySelectorAll(".tool-card"),
            function (card) {
              card.addEventListener("click", function (e) {
                if (
                  e.target.closest("[data-copy]") ||
                  e.target.closest("[data-favorite]") ||
                  e.target.closest("a")
                ) {
                  return;
                }
                state.activeId = card.getAttribute("data-id");
                updateViewer();
                renderChips();
                renderTools();
              });
            },
          );

          Array.prototype.forEach.call(
            toolList.querySelectorAll("[data-open]"),
            function (btn) {
              btn.addEventListener("click", function (e) {
                e.stopPropagation();
                state.activeId = btn.getAttribute("data-open");
                updateViewer();
                renderChips();
                renderTools();
              });
            },
          );

          Array.prototype.forEach.call(
            toolList.querySelectorAll("[data-copy]"),
            function (btn) {
              btn.addEventListener("click", function (e) {
                e.stopPropagation();
                var item = getById(btn.getAttribute("data-copy"));
                if (item) copyText(item.src, "Tool URL copied");
              });
            },
          );

          Array.prototype.forEach.call(
            toolList.querySelectorAll("[data-favorite]"),
            function (btn) {
              btn.addEventListener("click", function (e) {
                e.stopPropagation();
                toggleFavorite(btn.getAttribute("data-favorite"));
              });
            },
          );
        }

        function updateViewer() {
          var item = getActive();

          viewerName.textContent = item.name;
          viewerDesc.textContent = item.description;
          viewerCategory.textContent = item.categoryLabel;
          viewerKeywords.textContent = item.keywords.join(", ");
          viewerUse.textContent = item.use;
          viewerSrcText.textContent = item.src;
          viewerSrcLink.href = item.src;
          browserUrl.textContent = item.src;
          viewerPill.textContent = "✨ Now viewing: " + item.name;
          btnOpenCurrent.href = item.src;
          frame.src = item.src;

          if (item.id === "live-class") {
            setTimeout(function () {
              try {
                if (
                  frame.contentWindow &&
                  frame.contentWindow.location &&
                  frame.contentWindow.location.href === "about:blank"
                ) {
                  window.open(item.src, "_blank", "noopener");
                }
              } catch (err) {}
            }, 1200);
          }

          document.title =
            item.name + " – Online Code Editors Hub | Programmer's Picnic";

          updateHash(item.id);
          touchRecent(item.id);
          renderQuickLinks();
        }

        function updateHash(id) {
          var newHash = "tool=" + encodeURIComponent(id);
          if (window.location.hash !== "#" + newHash) {
            history.replaceState(null, "", "#" + newHash);
          }
        }

        function getToolFromHash() {
          var hash = window.location.hash || "";
          var match = hash.match(/tool=([^&]+)/);
          if (!match) return null;
          try {
            return decodeURIComponent(match[1]);
          } catch (err) {
            return null;
          }
        }

        function copyText(text, msg) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard
              .writeText(text)
              .then(function () {
                toast(msg || "Copied");
              })
              .catch(function () {
                fallbackCopy(text, msg);
              });
          } else {
            fallbackCopy(text, msg);
          }
        }

        function fallbackCopy(text, msg) {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.top = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
            toast(msg || "Copied");
          } catch (err) {
            toast("Copy failed");
          }
          ta.remove();
        }

        function toast(message) {
          var el = document.createElement("div");
          el.textContent = message;
          el.style.position = "fixed";
          el.style.left = "50%";
          el.style.bottom = "18px";
          el.style.transform = "translateX(-50%)";
          el.style.background = "rgba(31,35,40,.94)";
          el.style.color = "#fff";
          el.style.padding = "10px 14px";
          el.style.borderRadius = "999px";
          el.style.fontSize = "12px";
          el.style.fontWeight = "800";
          el.style.zIndex = "999";
          el.style.boxShadow = "0 16px 34px rgba(0,0,0,.24)";
          el.style.opacity = "0";
          el.style.transition = "opacity .18s ease, transform .18s ease";
          document.body.appendChild(el);

          requestAnimationFrame(function () {
            el.style.opacity = "1";
            el.style.transform = "translateX(-50%) translateY(-2px)";
          });

          setTimeout(function () {
            el.style.opacity = "0";
            el.style.transform = "translateX(-50%)";
            setTimeout(function () {
              el.remove();
            }, 220);
          }, 1400);
        }

        function getLiveClassItem() {
          return getById("live-class");
        }

        function previewLiveClass() {
          var item = getLiveClassItem();
          if (!item) return;
          state.activeId = item.id;
          updateViewer();
          renderChips();
          renderTools();
          document
            .getElementById("viewer")
            .scrollIntoView({ behavior: "smooth", block: "start" });
        }

        function joinLiveClass() {
          var item = getLiveClassItem();
          if (!item) return;
          window.open(item.src, "_blank", "noopener");
        }

        function copyLiveClassLink() {
          var item = getLiveClassItem();
          if (!item) return;
          copyText(item.src, "Live class link copied");
        }

        function openLiveModal() {
          if (!liveModal) return;
          liveModal.classList.remove("hidden");
          liveModal.setAttribute("aria-hidden", "false");
        }

        function closeLiveModal() {
          if (!liveModal) return;
          liveModal.classList.add("hidden");
          liveModal.setAttribute("aria-hidden", "true");
        }

        function setActiveSideLink(target) {
          Array.prototype.forEach.call(
            document.querySelectorAll(".side-link"),
            function (link) {
              link.classList.remove("active");
            },
          );
          if (target) target.classList.add("active");
        }

        searchBox.addEventListener("input", function () {
          state.search = this.value;
          renderTools();
        });

        Array.prototype.forEach.call(
          document.querySelectorAll("[data-filter]"),
          function (btn) {
            btn.addEventListener("click", function () {
              state.filter = btn.getAttribute("data-filter");

              Array.prototype.forEach.call(
                document.querySelectorAll("[data-filter]"),
                function (b) {
                  b.classList.remove("active");
                },
              );
              btn.classList.add("active");
              renderTools();
            });
          },
        );

        btnReload.addEventListener("click", function () {
          frame.src = getActive().src;
          toast("Workspace reloaded");
        });

        btnCopySrc.addEventListener("click", function () {
          copyText(getActive().src, "Source URL copied");
        });

        btnCopyShare.addEventListener("click", function () {
          copyText(getShareUrl(getActive()), "Share link copied");
        });

        btnOpenCurrentTop.addEventListener("click", function () {
          window.open(getActive().src, "_blank", "noopener");
        });

        if (btnLiveClass) {
          btnLiveClass.addEventListener("click", openLiveModal);
        }

        if (btnJoinLiveClass) {
          btnJoinLiveClass.addEventListener("click", joinLiveClass);
        }

        if (btnPreviewLiveClass) {
          btnPreviewLiveClass.addEventListener("click", previewLiveClass);
        }

        if (btnCopyLiveClass) {
          btnCopyLiveClass.addEventListener("click", copyLiveClassLink);
        }

        if (liveModalClose) {
          liveModalClose.addEventListener("click", closeLiveModal);
        }

        if (liveModalBackdrop) {
          liveModalBackdrop.addEventListener("click", closeLiveModal);
        }

        if (btnModalJoinLive) {
          btnModalJoinLive.addEventListener("click", function () {
            closeLiveModal();
            joinLiveClass();
          });
        }

        if (btnModalPreviewLive) {
          btnModalPreviewLive.addEventListener("click", function () {
            closeLiveModal();
            previewLiveClass();
          });
        }

        if (btnModalCopyLive) {
          btnModalCopyLive.addEventListener("click", copyLiveClassLink);
        }

        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape") closeLiveModal();
        });

        if (sideToggle) {
          sideToggle.addEventListener("click", function () {
            sideNav.classList.toggle("open");
          });
        }

        Array.prototype.forEach.call(
          document.querySelectorAll("[data-tool-jump]"),
          function (btn) {
            btn.addEventListener("click", function () {
              var id = btn.getAttribute("data-tool-jump");
              if (getById(id)) {
                state.activeId = id;
                updateViewer();
                renderChips();
                renderTools();
                setActiveSideLink(btn);
                document
                  .getElementById("viewer")
                  .scrollIntoView({ behavior: "smooth", block: "start" });

                if (window.innerWidth <= 1100) {
                  sideNav.classList.remove("open");
                }
              }
            });
          },
        );

        Array.prototype.forEach.call(
          document.querySelectorAll("[data-nav]"),
          function (link) {
            link.addEventListener("click", function () {
              setActiveSideLink(link);
              if (window.innerWidth <= 1100) {
                sideNav.classList.remove("open");
              }
            });
          },
        );

        window.addEventListener("hashchange", function () {
          var hashedTool = getToolFromHash();
          if (hashedTool && getById(hashedTool)) {
            state.activeId = hashedTool;
            updateViewer();
            renderChips();
            renderTools();
          }
        });



        var notificationsUrl = "https://editor.learnwithchampak.live/notifications.json";
        var notificationStorageKey = "pp_editor_notifications_seen_v1";
        var notificationPermissionAskedKey = "pp_editor_notifications_permission_asked_v1";
        var notificationState = {
          items: [],
          seen: loadArray(notificationStorageKey),
          initialized: false,
          lastSignature: "",
          timer: null,
        };

        var notifyBtn = document.getElementById("btnNotifications");
        var notifyBadge = document.getElementById("notifyBadge");
        var notifyPanel = document.getElementById("notifyPanel");
        var notifyBackdrop = document.getElementById("notifyBackdrop");
        var notifyClose = document.getElementById("notifyClose");
        var notifyList = document.getElementById("notifyList");
        var notifyStatus = document.getElementById("notifyStatus");
        var notifyRefreshBtn = document.getElementById("notifyRefreshBtn");
        var notifyMarkAllBtn = document.getElementById("notifyMarkAllBtn");
        var notifyBrowserBtn = document.getElementById("notifyBrowserBtn");
        var notifyToastStack = document.getElementById("notifyToastStack");

        function saveNotificationSeen() {
          saveArray(notificationStorageKey, notificationState.seen.slice(-300));
        }

        function normalizeNotifications(payload) {
          var list = [];
          if (Array.isArray(payload)) {
            list = payload;
          } else if (payload && Array.isArray(payload.notifications)) {
            list = payload.notifications;
          } else if (payload && Array.isArray(payload.items)) {
            list = payload.items;
          } else if (payload && Array.isArray(payload.data)) {
            list = payload.data;
          }

          return list
            .map(function (item, index) {
              var title = String(
                item && (item.title || item.name || item.heading || item.label || "Update"),
              ).trim();
              var message = String(
                item &&
                  (item.message || item.body || item.text || item.description || item.summary || ""),
              ).trim();
              var url = String(item && (item.url || item.link || item.href || "") || "").trim();
              var createdAt =
                String(
                  item &&
                    (item.createdAt || item.updatedAt || item.date || item.time || item.timestamp || ""),
                ).trim() || "";
              var important =
                Boolean(item && (item.important || item.priority === "high" || item.level === "high"));
              var id = String(
                item &&
                  (item.id || item.slug || item.key || item.uuid || item.guid || url || ""),
              ).trim();
              if (!id) {
                id = [title, message, createdAt, index].join("|");
              }
              return {
                id: id,
                title: title,
                message: message,
                url: url,
                createdAt: createdAt,
                important: important,
              };
            })
            .filter(function (item) {
              return item.title || item.message;
            })
            .sort(function (a, b) {
              var ta = a.createdAt ? Date.parse(a.createdAt) : 0;
              var tb = b.createdAt ? Date.parse(b.createdAt) : 0;
              return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
            });
        }

        function isNotificationSeen(id) {
          return notificationState.seen.indexOf(id) !== -1;
        }

        function getUnreadNotifications() {
          return notificationState.items.filter(function (item) {
            return !isNotificationSeen(item.id);
          });
        }

        function updateNotificationBadge() {
          if (!notifyBadge || !notifyBtn) return;
          var unread = getUnreadNotifications().length;
          notifyBadge.textContent = unread > 99 ? "99+" : String(unread);
          notifyBadge.classList.toggle("hidden", unread === 0);
          notifyBtn.setAttribute("aria-label", unread ? unread + " unread notifications" : "Open notifications");
        }

        function formatNotificationTime(value) {
          if (!value) return "Latest";
          var date = new Date(value);
          if (isNaN(date.getTime())) return value;
          var diff = Date.now() - date.getTime();
          var minute = 60 * 1000;
          var hour = 60 * minute;
          var day = 24 * hour;
          if (diff < hour) {
            return Math.max(1, Math.round(diff / minute)) + " min ago";
          }
          if (diff < day) {
            return Math.max(1, Math.round(diff / hour)) + " hr ago";
          }
          return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
        }

        function renderNotifications() {
          if (!notifyList) return;
          updateNotificationBadge();

          if (!notificationState.items.length) {
            notifyList.innerHTML =
              '<div class="notify-empty"><strong>No notifications yet.</strong><br />Add items to <code>notifications.json</code> and they will appear here.</div>';
            return;
          }

          notifyList.innerHTML = notificationState.items
            .map(function (item) {
              var unread = !isNotificationSeen(item.id);
              var attrs = item.url
                ? 'href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener"'
                : 'href="#" data-notification-id="' + escapeHtml(item.id) + '"';
              return (
                '<a class="notify-item ' +
                (unread ? 'unread' : '') +
                '" ' +
                attrs +
                '>' +
                '<div class="notify-item-head">' +
                '<div>' +
                '<h4 class="notify-item-title">' +
                escapeHtml(item.title || 'Update') +
                '</h4>' +
                '</div>' +
                (unread ? '<span class="notify-dot" aria-hidden="true"></span>' : '') +
                '</div>' +
                '<p class="notify-item-message">' +
                escapeHtml(item.message || 'Open for details.') +
                '</p>' +
                '<div class="notify-item-meta">' +
                '<span>' +
                escapeHtml(formatNotificationTime(item.createdAt)) +
                '</span>' +
                (item.important ? '<span class="notify-tag">Important</span>' : '') +
                (item.url ? '<span>Open link ↗</span>' : '') +
                '</div>' +
                '</a>'
              );
            })
            .join('');

          Array.prototype.forEach.call(
            notifyList.querySelectorAll('[data-notification-id]'),
            function (node) {
              node.addEventListener('click', function (event) {
                event.preventDefault();
                markNotificationRead(node.getAttribute('data-notification-id'));
              });
            },
          );
        }

        function setNotificationStatus(text, isError) {
          if (!notifyStatus) return;
          notifyStatus.textContent = text;
          notifyStatus.style.color = isError ? '#b91c1c' : '';
        }

        function markNotificationRead(id) {
          if (!id || isNotificationSeen(id)) return;
          notificationState.seen.push(id);
          saveNotificationSeen();
          renderNotifications();
        }

        function markAllNotificationsRead() {
          notificationState.items.forEach(function (item) {
            if (!isNotificationSeen(item.id)) {
              notificationState.seen.push(item.id);
            }
          });
          saveNotificationSeen();
          renderNotifications();
        }

        function openNotifications() {
          if (!notifyPanel) return;
          notifyPanel.classList.remove('hidden');
          notifyPanel.setAttribute('aria-hidden', 'false');
          if (notifyBtn) notifyBtn.setAttribute('aria-expanded', 'true');
          markAllNotificationsRead();
        }

        function closeNotifications() {
          if (!notifyPanel) return;
          notifyPanel.classList.add('hidden');
          notifyPanel.setAttribute('aria-hidden', 'true');
          if (notifyBtn) notifyBtn.setAttribute('aria-expanded', 'false');
        }

        function showNotificationToast(item) {
          if (!notifyToastStack || !item) return;
          var toast = document.createElement('div');
          toast.className = 'notify-toast';
          var inner =
            '<strong>' +
            escapeHtml(item.title || 'New notification') +
            '</strong><div>' +
            escapeHtml(item.message || '') +
            '</div>' +
            (item.url
              ? '<div style="margin-top:8px;"><a href="' +
                escapeHtml(item.url) +
                '" target="_blank" rel="noopener">Open update ↗</a></div>'
              : '');
          toast.innerHTML = inner;
          notifyToastStack.appendChild(toast);
          setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px)';
            setTimeout(function () {
              if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 220);
          }, 5200);
        }

        function maybeShowBrowserNotification(item) {
          if (!("Notification" in window) || Notification.permission !== 'granted') return;
          try {
            var notice = new Notification(item.title || 'Programmer\'s Picnic', {
              body: item.message || 'New update available.',
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: item.id,
            });
            notice.onclick = function () {
              window.focus();
              if (item.url) window.open(item.url, '_blank', 'noopener');
              notice.close();
            };
          } catch (error) {
            console.warn('Browser notification failed', error);
          }
        }

        function requestBrowserNotificationPermission() {
          if (!("Notification" in window)) {
            setNotificationStatus('This browser does not support system notifications.', true);
            return;
          }
          localStorage.setItem(notificationPermissionAskedKey, '1');
          Notification.requestPermission().then(function (permission) {
            if (permission === 'granted') {
              setNotificationStatus('Browser alerts enabled. New pulled updates will alert you here.', false);
            } else if (permission === 'denied') {
              setNotificationStatus('Browser alerts are blocked. You can still read updates in the panel.', true);
            } else {
              setNotificationStatus('Browser alert permission was dismissed.', false);
            }
          });
        }

        function notificationSignature(items) {
          return items
            .slice(0, 20)
            .map(function (item) {
              return [item.id, item.createdAt, item.title].join('|');
            })
            .join('||');
        }

        function handleIncomingNotifications(items) {
          var previousUnreadIds = getUnreadNotifications().map(function (item) {
            return item.id;
          });
          notificationState.items = items;
          renderNotifications();

          if (!notificationState.initialized) {
            notificationState.initialized = true;
            return;
          }

          var newUnread = getUnreadNotifications().filter(function (item) {
            return previousUnreadIds.indexOf(item.id) === -1;
          });

          if (!newUnread.length) return;

          newUnread.slice(0, 2).forEach(function (item) {
            showNotificationToast(item);
            maybeShowBrowserNotification(item);
          });
        }

        function fetchNotifications(options) {
          options = options || {};
          if (!options.silent) {
            setNotificationStatus('Checking for updates…', false);
          }

          return fetch(notificationsUrl + '?ts=' + Date.now(), {
            cache: 'no-store',
          })
            .then(function (response) {
              if (!response.ok) {
                throw new Error('HTTP ' + response.status);
              }
              return response.json();
            })
            .then(function (payload) {
              var items = normalizeNotifications(payload);
              var signature = notificationSignature(items);
              notificationState.lastSignature = signature;
              handleIncomingNotifications(items);
              setNotificationStatus(
                items.length
                  ? 'Auto-refreshing every 60 seconds from notifications.json.'
                  : 'notifications.json is reachable, but no active items were found.',
                false,
              );
            })
            .catch(function (error) {
              console.error('Notification fetch failed:', error);
              setNotificationStatus(
                'Could not load notifications.json right now. Pull-to-refresh is available via the Refresh button.',
                true,
              );
            });
        }

        function initNotifications() {
          if (!notifyBtn || !notifyPanel || !notifyList) return;

          notifyBtn.addEventListener('click', function () {
            if (notifyPanel.classList.contains('hidden')) openNotifications();
            else closeNotifications();
          });

          if (notifyBackdrop) notifyBackdrop.addEventListener('click', closeNotifications);
          if (notifyClose) notifyClose.addEventListener('click', closeNotifications);
          if (notifyRefreshBtn) notifyRefreshBtn.addEventListener('click', function () {
            fetchNotifications();
          });
          if (notifyMarkAllBtn) notifyMarkAllBtn.addEventListener('click', markAllNotificationsRead);
          if (notifyBrowserBtn) {
            notifyBrowserBtn.addEventListener('click', requestBrowserNotificationPermission);
            if (!("Notification" in window)) {
              notifyBrowserBtn.disabled = true;
              notifyBrowserBtn.textContent = 'Browser alerts unavailable';
            } else if (Notification.permission === 'granted') {
              notifyBrowserBtn.textContent = '🔔 Browser alerts enabled';
            }
          }

          document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && notifyPanel && !notifyPanel.classList.contains('hidden')) {
              closeNotifications();
            }
          });

          fetchNotifications();
          notificationState.timer = window.setInterval(function () {
            fetchNotifications({ silent: true });
          }, 60000);
        }

        (function init() {
          var hashedTool = getToolFromHash();
          if (hashedTool && getById(hashedTool)) {
            state.activeId = hashedTool;
          }

          renderChips();
          renderQuickLinks();
          renderTools();
          updateViewer();
          initNotifications();
        })();
      })();
    