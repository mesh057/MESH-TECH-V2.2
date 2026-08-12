# Railway `.menu` Redeployment

The production zero-command fix is in commit `c141e7a` on `main`. The root cause was that `BotInstance` passed the command Map as the second message-handler argument but did not include it in the resources object delivered to command handlers. The menu command therefore received an empty resource catalog in the Railway runtime and displayed zero commands.

Railway must redeploy from the updated `main` branch containing `c141e7a` before testing again. After deployment, pair or restore the bot instance, wait for the connection welcome message, and send `.menu` in the self-chat. The menu should report the loaded catalog and display the command list. The current local regression suite verifies 458 loaded entries, 397 unique commands, the production resource shape, the native-list fallback, pairing isolation, and status/presence behavior.

If Railway still shows zero commands after the deployment is confirmed at `c141e7a`, capture the first startup logs after the new deploy and the `.menu` request logs. Do not share session IDs, encryption keys, or other secrets.
