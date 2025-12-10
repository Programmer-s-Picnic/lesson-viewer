// engine.js
// Generic Programmer's Picnic visualizer engine
// Handles: rendering array, log, code highlight, step navigation, autoplay.

(function () {
    function PPVisualizer(config) {
        this.config = config || {};
        this.currentStepIndex = 0;
        this.autoTimer = null;
        this.speedMs = 900;

        this.cacheDom();
        this.attachEvents();
        this.renderArrayBase();
        this.renderCode(this.config.code || "");
        this.renderStep();
    }

    PPVisualizer.prototype.cacheDom = function () {
        this.titleEl = document.getElementById("pp-vis-title");
        this.subtitleEl = document.getElementById("pp-vis-subtitle");
        this.arrayRowEl = document.getElementById("pp-vis-array-row");
        this.logEl = document.getElementById("pp-vis-log");
        this.codeEl = document.getElementById("pp-vis-code");
        this.stepIndicatorEl = document.getElementById("pp-vis-step-indicator");
        this.btnPrev = document.getElementById("pp-vis-btn-prev");
        this.btnNext = document.getElementById("pp-vis-btn-next");
        this.btnPlay = document.getElementById("pp-vis-btn-play");
        this.btnReset = document.getElementById("pp-vis-btn-reset");
        this.speedSlider = document.getElementById("pp-vis-speed");
        this.speedLabel = document.getElementById("pp-vis-speed-label");
    };

    PPVisualizer.prototype.attachEvents = function () {
        var self = this;

        if (this.btnPrev) {
            this.btnPrev.addEventListener("click", function () {
                self.stopAuto();
                self.prevStep();
            });
        }

        if (this.btnNext) {
            this.btnNext.addEventListener("click", function () {
                self.stopAuto();
                self.nextStep();
            });
        }

        if (this.btnReset) {
            this.btnReset.addEventListener("click", function () {
                self.stopAuto();
                self.currentStepIndex = 0;
                self.renderStep();
            });
        }

        if (this.btnPlay) {
            this.btnPlay.addEventListener("click", function () {
                if (self.autoTimer) {
                    self.stopAuto();
                } else {
                    self.startAuto();
                }
            });
        }

        if (this.speedSlider) {
            this.speedSlider.addEventListener("input", function () {
                self.speedMs = Number(self.speedSlider.value);
                if (self.speedLabel) {
                    self.speedLabel.textContent = (self.speedMs / 1000).toFixed(1) + "s";
                }
                if (self.autoTimer) {
                    self.stopAuto();
                    self.startAuto();
                }
            });
            // initial label
            if (this.speedLabel) {
                this.speedLabel.textContent = (this.speedMs / 1000).toFixed(1) + "s";
            }
        }
    };

    PPVisualizer.prototype.update = function (config) {
        this.config = config || {};
        this.currentStepIndex = 0;
        this.stopAuto();

        this.renderArrayBase();
        this.renderCode(this.config.code || "");
        this.renderStep();
    };

    PPVisualizer.prototype.startAuto = function () {
        var self = this;
        if (this.autoTimer) return;
        if (this.btnPlay) this.btnPlay.textContent = "⏸ Pause";
        this.autoTimer = setInterval(function () {
            if (!self.config.steps || self.currentStepIndex >= self.config.steps.length - 1) {
                self.stopAuto();
                return;
            }
            self.nextStep();
        }, this.speedMs);
    };

    PPVisualizer.prototype.stopAuto = function () {
        if (this.autoTimer) {
            clearInterval(this.autoTimer);
            this.autoTimer = null;
            if (this.btnPlay) this.btnPlay.textContent = "▶ Auto Play";
        }
    };

    PPVisualizer.prototype.prevStep = function () {
        if (!this.config.steps) return;
        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
            this.renderStep();
        }
    };

    PPVisualizer.prototype.nextStep = function () {
        if (!this.config.steps) return;
        if (this.currentStepIndex < this.config.steps.length - 1) {
            this.currentStepIndex++;
            this.renderStep();
        }
    };

    PPVisualizer.prototype.renderArrayBase = function () {
        if (!this.arrayRowEl) return;
        var arr = this.config.array || [];
        this.arrayRowEl.innerHTML = "";
        arr.forEach(function (value, idx) {
            var cell = document.createElement("div");
            cell.className = "pp-vis-array-cell";
            cell.dataset.index = String(idx);

            var vEl = document.createElement("div");
            vEl.className = "pp-vis-array-value";
            vEl.textContent = String(value);

            var iEl = document.createElement("div");
            iEl.className = "pp-vis-array-index";
            iEl.textContent = "[" + idx + "]";

            var pointerWrap = document.createElement("div");
            pointerWrap.className = "pp-vis-pointer-badges";

            cell.appendChild(vEl);
            cell.appendChild(iEl);
            cell.appendChild(pointerWrap);

            this.arrayRowEl.appendChild(cell);
        }, this);
    };

    PPVisualizer.prototype.renderCode = function (codeStr) {
        if (!this.codeEl) return;
        var lines = codeStr.split("\n");
        this.codeEl.innerHTML = "";
        this.codeLines = [];

        for (var i = 0; i < lines.length; i++) {
            var lineNum = i + 1;
            var div = document.createElement("div");
            div.className = "pp-vis-code-line";
            div.dataset.line = String(lineNum);

            var numSpan = document.createElement("span");
            numSpan.style.opacity = "0.45";
            numSpan.style.marginRight = "4px";
            numSpan.textContent = lineNum.toString().padStart(2, " ") + " ";

            var textSpan = document.createElement("span");
            textSpan.textContent = lines[i] || " ";

            div.appendChild(numSpan);
            div.appendChild(textSpan);

            this.codeEl.appendChild(div);
            this.codeLines.push(div);
        }
    };

    PPVisualizer.prototype.clearArrayState = function () {
        if (!this.arrayRowEl) return;
        var cells = this.arrayRowEl.querySelectorAll(".pp-vis-array-cell");
        cells.forEach(function (cell) {
            cell.classList.remove(
                "pp-vis-cell-active",
                "pp-vis-cell-compare",
                "pp-vis-cell-found",
                "pp-vis-cell-miss"
            );
            var badgesWrap = cell.querySelector(".pp-vis-pointer-badges");
            if (badgesWrap) badgesWrap.innerHTML = "";
        });
    };

    PPVisualizer.prototype.renderStep = function () {
        var steps = this.config.steps || [];
        if (!steps.length) {
            if (this.logEl) {
                this.logEl.innerHTML =
                    "<span class='pp-vis-log-label'>No steps defined. Try changing mode or data.</span>";
            }
            if (this.stepIndicatorEl) {
                this.stepIndicatorEl.textContent = "Step 0 / 0";
            }
            if (this.btnPrev) this.btnPrev.disabled = true;
            if (this.btnNext) this.btnNext.disabled = true;
            return;
        }

        if (this.currentStepIndex < 0) this.currentStepIndex = 0;
        if (this.currentStepIndex >= steps.length) this.currentStepIndex = steps.length - 1;

        var step = steps[this.currentStepIndex];

        if (this.stepIndicatorEl) {
            this.stepIndicatorEl.textContent =
                "Step " + (this.currentStepIndex + 1) + " / " + steps.length;
        }

        if (this.btnPrev) this.btnPrev.disabled = this.currentStepIndex === 0;
        if (this.btnNext) this.btnNext.disabled = this.currentStepIndex === steps.length - 1;

        var label = step.label || "Step " + (this.currentStepIndex + 1);
        var desc = step.description || "";
        if (this.logEl) {
            this.logEl.innerHTML =
                "<span class='pp-vis-log-label'>" + label + ":</span> " +
                (desc ? "<br>" + desc : "");
        }

        this.clearArrayState();
        this.applyStepToArray(step);
        this.applyCodeHighlight(step.highlightLines || []);

        if (this.titleEl && this.config.title) {
            this.titleEl.textContent = this.config.title;
        }
        if (this.subtitleEl && this.config.subtitle) {
            this.subtitleEl.textContent = this.config.subtitle;
        }
    };

    PPVisualizer.prototype.applyStepToArray = function (step) {
        if (!this.arrayRowEl) return;
        var cells = this.arrayRowEl.querySelectorAll(".pp-vis-array-cell");
        function getCell(index) {
            return cells[index] || null;
        }

        if (typeof step.activeIndex === "number") {
            var a = getCell(step.activeIndex);
            if (a) a.classList.add("pp-vis-cell-active");
        }
        if (typeof step.compareIndex === "number") {
            var c = getCell(step.compareIndex);
            if (c) c.classList.add("pp-vis-cell-compare");
        }
        if (typeof step.foundIndex === "number") {
            var f = getCell(step.foundIndex);
            if (f) f.classList.add("pp-vis-cell-found");
        }
        if (typeof step.missIndex === "number") {
            var m = getCell(step.missIndex);
            if (m) m.classList.add("pp-vis-cell-miss");
        }

        if (step.pointers) {
            Object.keys(step.pointers).forEach(function (name) {
                var idx = step.pointers[name];
                if (typeof idx !== "number") return;
                var cell = getCell(idx);
                if (!cell) return;
                var wrap = cell.querySelector(".pp-vis-pointer-badges");
                if (!wrap) return;

                var badge = document.createElement("div");
                badge.className = "pp-vis-pointer-badge";
                var lower = name.toLowerCase();

                if (lower === "current") {
                    badge.classList.add("pp-vis-pointer-current");
                    badge.textContent = "curr";
                } else if (lower === "low") {
                    badge.classList.add("pp-vis-pointer-low");
                    badge.textContent = "low";
                } else if (lower === "mid") {
                    badge.classList.add("pp-vis-pointer-mid");
                    badge.textContent = "mid";
                } else if (lower === "high") {
                    badge.classList.add("pp-vis-pointer-high");
                    badge.textContent = "high";
                } else {
                    badge.textContent = name;
                }

                wrap.appendChild(badge);
            });
        }
    };

    PPVisualizer.prototype.applyCodeHighlight = function (lines) {
        var set = new Set(lines || []);
        if (!this.codeLines) return;
        this.codeLines.forEach(function (lineDiv) {
            var ln = Number(lineDiv.dataset.line);
            lineDiv.classList.remove("pp-vis-code-line-active", "pp-vis-code-line-dim");
            if (set.size === 0) return;
            if (set.has(ln)) {
                lineDiv.classList.add("pp-vis-code-line-active");
            } else {
                lineDiv.classList.add("pp-vis-code-line-dim");
            }
        });
    };

    // Public initializer, safe to call multiple times
    window.initPPVisualizer = function (config) {
        if (!window.__ppvisInstance) {
            window.__ppvisInstance = new PPVisualizer(config);
        } else {
            window.__ppvisInstance.update(config);
        }
        return window.__ppvisInstance;
    };
})();
