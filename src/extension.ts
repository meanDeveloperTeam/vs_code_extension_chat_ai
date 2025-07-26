import { OpenAI } from "openai";
import dotenv from "dotenv";
import * as vscode from "vscode";
import { ensureCollection, storeInQdrant, queryFromQdrant } from "./qdrant-helper";
dotenv.config();

const openai = new OpenAI({
  apiKey: "",
  baseURL: ""
});

export async function activate(context: vscode.ExtensionContext) {
  await ensureCollection();

  const enhanceCmd = vscode.commands.registerCommand('extension.enhanceTask', async () => {
    try {
      console.log("Enhance Task command triggered");
      const task = await vscode.window.showInputBox({ prompt: 'What task do you want to enhance?' });
      if (!task) return;

      console.log("Calling OpenAI API with task:", task);
      const completion = await openai.chat.completions.create({
        model: "Qwen/Qwen3-Coder-480B-A35B-Instruct:novita",
        messages: [
          { role: "user", content: `Enhance this task: ${task}` }
        ],
      });

      console.log("OpenAI API response:", completion);
      vscode.window.showInformationMessage(completion.choices[0].message.content || "No result!");
    } catch (error) {
      console.error("Error in enhanceTask:", error);
      vscode.window.showErrorMessage("Enhance Task failed: " + (error as Error).message);
    }
  });

  // Store Code Snippet in Qdrant
  const storeCmd = vscode.commands.registerCommand('extension.storeSnippet', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const code = editor.document.getText();
    await storeInQdrant('code-' + Date.now(), code);

    vscode.window.showInformationMessage('Code stored in vector DB.');
  });

  // Query from Qdrant
  const queryCmd = vscode.commands.registerCommand('extension.querySnippet', async () => {
    const question = await vscode.window.showInputBox({ prompt: 'What do you want to find?' });
    if (!question) return;

    const results = await queryFromQdrant(question);
    const top = results[0]?.payload?.text || 'No similar code found.';

    vscode.window.showInformationMessage('Closest Match:\n' + top);
  });
  context.subscriptions.push(enhanceCmd, storeCmd, queryCmd);
}