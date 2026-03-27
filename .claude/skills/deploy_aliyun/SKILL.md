---
name: deployaliyun
description: Auto-generate commit message and deploy to Aliyun ECS server (39.97.62.60)
disable-model-invocation: false
allowed-tools: Bash, Read
---

# Deploy to Aliyun ECS (39.97.62.60)

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

3. **Execute deployment immediately**
   - Commit and push changes:
     ```bash
     git add .
     git commit -m "COMMIT_MESSAGE"
     git push
     ```
   - Copy the project env files to the server:
     ```bash
     scp -i ~/.ssh/wu.pem .env ecs-user@39.97.62.60:/home/ecs-user/calendar/.env
     scp -i ~/.ssh/wu.pem .env.local ecs-user@39.97.62.60:/home/ecs-user/calendar/.env.local
     ```
   - Build locally:
     ```bash
     pnpm build
     ```
   - Rsync source files and build output to server (excludes node_modules and test assets):
     ```bash
     rsync -avz --exclude='.git' --exclude='node_modules' --exclude='public/posters' \
       -e "ssh -i ~/.ssh/wu.pem -o StrictHostKeyChecking=no" \
       . ecs-user@39.97.62.60:/home/ecs-user/calendar/
     ```
   - SSH to server and restart with the pre-built output:
     ```bash
     ssh -i ~/.ssh/wu.pem -o StrictHostKeyChecking=no ecs-user@39.97.62.60 "
       cd /home/ecs-user/calendar &&
       pnpm install --frozen-lockfile &&
       pnpm exec drizzle-kit migrate &&
       pm2 restart calendar
     "
     ```
   - Monitor output and report any errors

4. **Verify deployment**
   - Check PM2 status: `pm2 status`
   - Confirm app is running on port 5002

5. **Clean up**
   - After successful deployment, check for temporary files
   - Remove any unnecessary files per user's global instructions

## Server Details
- **Host**: 39.97.62.60
- **User**: ecs-user
- **SSH Key**: ~/.ssh/wu.pem
- **App Port**: 5002
- **Project Dir**: /home/ecs-user/calendar
- **Process Manager**: PM2 (process name: `calendar`)

## Example

```
User: /deploy_aliyun
Assistant: Deploying to Aliyun with commit message: "Fix timezone handling in event display"
[Executes deployment immediately]
```
