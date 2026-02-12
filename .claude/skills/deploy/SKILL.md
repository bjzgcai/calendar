---
name: deploy
description: Auto-generate commit message and deploy to production
disable-model-invocation: false
allowed-tools: Bash, Read
---

# Deploy to Production

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
   - Run: `./deploy-to-server.sh "COMMIT_MESSAGE"` from project root
   - The script will:
     - Commit the changes with `git add . && git commit`
     - Push to remote repository
     - SSH to production server (10.101.1.253) and deploy
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
