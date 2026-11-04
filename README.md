# KNG Estate Organisation Chart

A static, no-login organisation chart for KNG Estate. It runs on GitHub Pages, Render Static Site, or any static web host.

## Files
- `index.html` – page structure
- `style.css` – black and red styling
- `app.js` – chart layout, editor, import/export and browser saving

## Deploy on Render
1. Push the contents of this folder to your GitHub repository.
2. In Render choose **New → Static Site** and connect the repository.
3. Set the Publish Directory to `.` (leave Build Command empty).
4. Deploy.

## Editing
Select **Edit chart**. Click any position to edit its title, name, or reporting line. Use the form to add a position. Changes save in the current browser using local storage. Use Export Chart Data for backups and Import Chart Data to restore them on another browser/device.

This is intentionally a static site: there is no login, backend, or shared editing. Browser-local changes are not automatically visible to other visitors.
