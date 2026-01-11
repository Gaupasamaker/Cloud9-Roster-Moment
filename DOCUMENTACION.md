# 🎮 Roster Moment - Project Documentation (Hackathon MVP)

## 1. Motivation and Vision
**Roster Moment** is an application designed to elevate the fan experience at in-person esports events (specifically for **Cloud9**). The idea arises from the need to emotionally connect followers with their idols in an innovative and shareable way.

The application allows a fan to take a photograph and, through state-of-the-art generative Artificial Intelligence, be integrated into an epic poster alongside the team's professional players, receiving the result instantly on their mobile and by email.

---

## 2. Technology Stack
To build this MVP in record time and with high fidelity, we have selected leading technologies:

*   **Generative AI:** `Google Gemini 3 Pro Image Preview` (Nano Banana Pro). Chosen for its unique ability to process up to 8 reference images simultaneously, allowing for the mixing of the fan's face with those of 5 real players.
*   **Frontend:** Vanilla JavaScript (SPA), HTML5, and CSS3 (Mobile-first). Optimized for speed and simplicity without heavy dependencies.
*   **Backend:** Node.js with Express. Responsible for orchestration between the AI, the file system, and email dispatch.
*   **Emailing:** `Brevo (Sendinblue)` via HTTPS API. Implemented to bypass SMTP port blocks in cloud environments.
*   **Hosting:**
    *   **Vercel:** For frontend deployment (static assets and PWA).
    *   **Render:** For the Node.js server (dynamic backend).
*   **PWA:** Progressive Web App enabled so the app can be installable on hostesses' tablets and mobiles.

---

## 3. Technical Challenges and "Bulletproof" Solutions

During development, we faced critical challenges that we solved with creative engineering:

### A. The AI Infinite Loop
*   **Problem:** The Pro model sometimes took more than 30 seconds, causing connection timeouts on the server.
*   **Solution:** We implemented a **reactive state management** system and real-time logs. We optimized prompts to be "Critical Mandates" that prioritize the fan's identity, reducing model rejection failures.

### B. Corrupt or Not Found Images
*   **Problem:** Serving images via URLs from the server's hard drive was unstable due to write latency.
*   **Solution:** **Real-Time Base64**. The server returns the encoded image directly in the response JSON. This guarantees that the image is displayed 100% of the time without depending on external files.

### C. Cloud Email Blocking
*   **Problem:** Render servers block standard SMTP traffic (ports 587/465) to prevent spam.
*   **Solution:** We migrated from Nodemailer to the **Brevo REST API**. By sending the email through a web request (HTTPS), the blocks disappear and delivery is instantaneous.

### D. Mobile Device Visualization
*   **Problem:** Unwanted cropping in the final image and lack of detail.
*   **Solution:** We implemented an **Immersive Zoom Mode**. By tapping the image, it expands to full screen using CSS Transitions, allowing the generated art to be appreciated in detail.

---

## 4. Development Methodology: Junie + WebStorm

This project would not have been possible in this timeframe without the use of **Junie**, an autonomous AI agent integrated into the **JetBrains (WebStorm)** ecosystem.

*   **Junie as Architect and PM:** It didn't just write code; it acted as Project Manager, proposing solutions to timeouts, suggesting port changes, and structuring the screen flow to improve UX.
*   **WebStorm as Operations Base:** The use of Git tools integrated into WebStorm allowed for continuous deployment to GitHub, Vercel, and Render without leaving the IDE, facilitating debugging through the integrated terminal and file navigation.
*   **Rapid Iteration:** Junie's ability to analyze production error logs (Render) and apply immediate patches allowed moving from a technical error to a functional solution in minutes.

---

## 5. Conclusions and Next Steps
We have achieved a **solid and scalable MVP**. The integration of multiple visual references in a single AI prompt marks an important technical differentiator for this Hackathon.

**Next steps (Post-MVP):**
1.  **Aesthetic Refinement:** Apply a more aggressive visual design aligned with the Cloud9 brand (neons, custom loading animations).
2.  **Social Media Sharing:** Direct integration with X (Twitter) and Instagram APIs.
3.  **Event Gallery:** A dashboard for organizers to see all "Roster Moments" generated during the day.

---
**Project developed for the Generative AI Hackathon - 2026**