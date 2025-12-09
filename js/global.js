// ------------------------------------------------------------
// Load shared sections (header + footer)
// ------------------------------------------------------------
function loadSection(url, elementId, errorMsg, callback) {
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${url}`);
      return res.text();
    })
    .then((html) => {
      const target = document.getElementById(elementId);
      if (target) target.innerHTML = html;
      if (callback) callback();
    })
    .catch(() => {
      const target = document.getElementById(elementId);
      if (target) target.innerHTML = errorMsg;
    });
}

// Load header
loadSection("header.html", "header", `<div class="error">Header failed to load.</div>`);

// Load footer
loadSection(
  "footer.html",
  "footer",
  `<div class="error">Footer failed to load.</div>`,
  function () {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const current = document.getElementById("breadcrumb-current");
    if (current) {
      const nameEl = current.querySelector('[itemprop="name"]');
      const itemEl = current.querySelector('[itemprop="item"]');
      if (nameEl) nameEl.textContent = document.title;
      if (itemEl) itemEl.setAttribute("content", window.location.href);
    }
  }
);

// ------------------------------------------------------------
// Status message helpers
// ------------------------------------------------------------
function showStatus(type, message) {
  const box = document.getElementById("statusMessage");
  if (!box) return;

  box.className = "status-message " + type; // info | success | error
  box.textContent = message;
  box.style.display = "block";
}

function clearStatus() {
  const box = document.getElementById("statusMessage");
  if (!box) return;

  box.style.display = "none";
  box.textContent = "";
  box.className = "status-message";
}

// ------------------------------------------------------------
// Start Call webhook helper (Make: SMC Start Call)
// ------------------------------------------------------------
async function startSantaCallWithToken(token) {
  try {
    const res = await fetch(
      "https://hook.us2.make.com/tf22v739bg7r7c07kubak5ik3qiyrf88",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      }
    );

    const data = await res.json();

    if (!data || data.ok !== true) {
      const reason = data && data.reason ? data.reason : "unknown_error";

      if (reason === "invalid_or_used_token") {
        showStatus(
          "error",
          "This magic link is invalid or has already been used. Please check your email for a fresh link."
        );
      } else {
        showStatus(
          "error",
          "We couldn’t start the call. Please try again using the link from your email."
        );
      }
      return false;
    }

    // Token successfully moved to in_progress
    return true;
  } catch (err) {
    console.error("Start call webhook failed:", err);
    showStatus(
      "error",
      "We couldn’t start the call right now. Please refresh the page and try again."
    );
    return false;
  }
}

// ------------------------------------------------------------
// ElevenLabs widget injection helper
// ------------------------------------------------------------
function injectSantaWidget(container, token) {
  if (!container) return;

  // Ensure the ElevenLabs script is present (only add once)
  if (!document.querySelector('script[data-elevenlabs-widget="true"]')) {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    script.type = "text/javascript";
    script.dataset.elevenlabsWidget = "true";
    document.body.appendChild(script);
  }

  // Clear anything old in the call container
  container.innerHTML = "";

  // Create the widget element
  const widget = document.createElement("elevenlabs-convai");
  widget.setAttribute("agent-id", "agent_6801kajjbdqxe03vwpes80erj84f");

  // (Optional) pass the token as metadata if you want later
  // widget.setAttribute("data-token", token);

  // Basic layout styling so it’s nicely centered
  widget.style.display = "block";
  widget.style.maxWidth = "480px";
  widget.style.margin = "0 auto";

  container.appendChild(widget);
}

// ------------------------------------------------------------
// DOMContentLoaded — Everything runs from here
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------------------------------------
  // LANDING PAGE — Video Modal Logic
  // ------------------------------------------------------------
  const modal = document.getElementById("videoModal");
  const closeBtn = document.querySelector(".modal-close");
  const youtubePlayer = document.getElementById("youtubePlayer");
  const triggers = document.querySelectorAll(".video-trigger");

  if (modal && closeBtn && youtubePlayer) {
    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        youtubePlayer.src = trigger.dataset.video;
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
      });
    });

    function closeModal() {
      modal.classList.remove("active");
      youtubePlayer.src = "";
      document.body.style.overflow = "auto";
    }

    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => e.target === modal && closeModal());
    document.addEventListener("keydown", (e) => e.key === "Escape" && closeModal());
  }

  // ------------------------------------------------------------
  // ORIENTATION PAGE — Token Validation + Video Gate
  // ------------------------------------------------------------

  const video = document.getElementById("orientationVideo");
  const startBtn = document.getElementById("startCallBtn");
  const callContainer = document.getElementById("callContainer");

  // If no start button → not this page
  if (!startBtn) return;

  // Parse token
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  // Hide Start button on first load
  startBtn.hidden = true;

  // Missing token
  if (!token) {
    showStatus(
      "error",
      "This link is missing a magic token. Please use the link from your email."
    );
    return;
  }

  // ------------------------------------------------------------
  // STEP 1 — Validate token ON PAGE LOAD
  // ------------------------------------------------------------
  async function validateToken() {
    showStatus("info", "Checking your magic link…");

    try {
      const res = await fetch(
        "https://hook.us2.make.com/wc51b2mt1c6we2y2eedqwi3nrntnmm97",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        }
      );

      const data = await res.json();

      if (!data.ok) {
        showStatus(
          "error",
          "This magic link is invalid or has already been used."
        );
        return;
      }

      // Token is valid
      clearStatus();
      showStatus(
        "info",
        "Watch the Elf Orientation to unlock your Start Call button."
      );

      startBtn.hidden = false;
      startBtn.disabled = true;
      startBtn.classList.add("locked");
    } catch (err) {
      console.error("Token validation failed:", err);
      showStatus(
        "error",
        "We couldn't verify your magic link. Please try again."
      );
    }
  }

  validateToken();

  // ------------------------------------------------------------
  // STEP 2 — Unlock Start button when video ends
  // ------------------------------------------------------------
  if (video) {
    video.addEventListener("ended", () => {
      clearStatus();
      startBtn.disabled = false;
      startBtn.classList.remove("locked");
      showStatus(
        "success",
        "You’re ready! Tap Start to begin your call with Santa."
      );
    });
  } else {
    // Fallback if video missing
    startBtn.hidden = false;
    startBtn.disabled = false;
    startBtn.classList.remove("locked");
    showStatus("success", "Tap Start to begin your call with Santa.");
  }


  // ------------------------------------------------------------
  // STEP 3 — Start Santa Call (after validation + video)
  // ------------------------------------------------------------
  startBtn.addEventListener("click", async () => {
    // Disable and hide the button immediately to prevent repeated clicks
    startBtn.disabled = true;
    startBtn.classList.add("locked");
    startBtn.style.display = "none";

    clearStatus();
    showStatus("success", "Connecting you to Santa… ✨");

    if (callContainer) {
      callContainer.hidden = false;
      callContainer.innerHTML = ""; // clear in case of retries
      callContainer.scrollIntoView({ behavior: "smooth" });
    }

    // 3A — Notify Make that the call is starting (optional but recommended)
    try {
      await fetch("https://hook.us2.make.com/tf22v739bg7r7c07kubak5ik3qiyrf88", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, event: "start_call" }),
      });
    } catch (err) {
      console.warn("Start-call webhook failed (non-blocking):", err);
    }

    // 3B — Inject ElevenLabs widget into the page
    if (callContainer) {
      callContainer.innerHTML = `
        <elevenlabs-convai
          agent-id="agent_6801kajjbdqxe03vwpes80erj84f"
          style="width:100%;max-width:480px;margin:0 auto;"
        ></elevenlabs-convai>
      `;
    }

    // 3C — Load the ElevenLabs widget script once
    if (!document.querySelector('script[data-elevenlabs-convai]')) {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      s.async = true;
      s.type = "text/javascript";
      s.dataset.elevenlabsConvai = "1";
      document.body.appendChild(s);
    }
  });
});