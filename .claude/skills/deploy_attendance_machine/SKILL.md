---
name: deploy_attendance_machine
description: Auto-generate commit message and deploy to attendance machine server (10.101.1.253)
disable-model-invocation: false
allowed-tools: Bash, Read
---

# Deploy to Attendance Machine Server (10.101.1.253)

When this skill is invoked:

1. **Analyze current git changes**
   - Run `git status --short` to see modified files
   - Run `git diff HEAD` to see actual changes
   - Review changes to understand what was modified

2. **Generate commit message**
   - Based on git diff and status, create a concise, descriptive commit message
   - Follow these guidelines:
     - Use imperative mood (e.g., "Add feature" not "Added feature")
     - Be clear and specific about WHAT changed
     - Use conventional commit prefixes when appropriate (feat:, fix:, refactor:, docs:, style:, chore:)
     - Keep it under 72 characters for the first line
     - Do NOT include "Claude Code" or Anthropic references
   - Examples:
     - "Add lunar calendar support and all-day events"
     - "Fix event type display and timezone handling"

3. **Execute deployment immediately**
   - Commit and push changes:
     ```bash
     git add .
     git commit -m "COMMIT_MESSAGE"
     git push
     ```
   - Copy the project root `.env` to the attendance machine server:
     ```bash
     scp -o StrictHostKeyChecking=no .env ecs-user@10.101.1.253:/home/ecs-user/calendar/.env
     ```
   - SSH to attendance machine server and deploy:
     ```bash
     ssh -o StrictHostKeyChecking=no ecs-user@10.101.1.253 "
       cd /home/ecs-user/calendar &&
       git pull &&
       pnpm install --frozen-lockfile &&
       pnpm build &&
       pm2 restart calendar
     "
     ```
   - Monitor output and report any errors

4. **Clean up**
   - After successful deployment, check for temporary files
   - Remove any unnecessary files per user's global instructions

## Example

```
User: /deploy
Assistant: Deploying with commit message: "Fix timezone handling in event display"
[Executes deployment immediately]
```
