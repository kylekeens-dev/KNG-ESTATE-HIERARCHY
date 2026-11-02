# KNG Estate Organisation Chart (No Login)

A static, GitHub-ready organisation chart website using the KNG red/black theme. It starts with the positions shown in the supplied organisation chart.

## Features
- No login, accounts, server, API or database required.
- Add roles, enter names, edit positions and change who each position reports to.
- Delete positions (and their sub-positions) from the editor.
- Automatically saves edits in the current browser using localStorage.
- Export/import chart data as JSON for backups or moving to another browser.
- Responsive layout with a horizontally scrollable hierarchy.

## Deploy on Render (Static Site)
1. Upload the contents of this folder to a GitHub repository.
2. In Render, choose **New + → Static Site**.
3. Connect the repository.
4. Set **Build Command** to blank (or leave it empty) and **Publish Directory** to `.`.
5. Deploy.

No environment variables or backend service are needed.

## Important about saving
Because this is deliberately a no-login, static website, edits are saved only in the browser/device where they are made. Other visitors will see the original version unless you publish the updated chart data yourself. Use **Export chart data** to back up your edits or move them to another browser using **Import chart data**. To make the same updated structure visible to everyone, edit `starter` in `app.js` to match your final chart and redeploy the site.
