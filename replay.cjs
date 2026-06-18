const fs = require('fs');

const logPath = 'C:/Users/TACOMPUTER/.gemini/antigravity/brain/fda1fe34-7c69-4703-a6b1-a7419837633e/.system_generated/logs/transcript_full.jsonl';

let content = fs.readFileSync('C:/Users/TACOMPUTER/.gemini/antigravity/brain/fda1fe34-7c69-4703-a6b1-a7419837633e/scratch/old_main_fixed.js', 'utf8');

const lines = fs.readFileSync(logPath, 'utf8').split('\n');

for (let i = 0; i <= 149; i++) {
    if (!lines[i]) continue;
    try {
        const obj = JSON.parse(lines[i]);
        if (obj.tool_calls) {
            for (const call of obj.tool_calls) {
                if (call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
                    const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
                    if (args.TargetFile && args.TargetFile.endsWith('main.js')) {
                        console.log(`Applying step ${i}: ${call.name}`);
                        
                        let chunks = [];
                        if (call.name === 'replace_file_content') {
                            chunks = [args];
                        } else {
                            chunks = args.ReplacementChunks || [];
                        }

                        let newContent = content;
                        let missing = false;
                        for (const chunk of chunks) {
                            let target = chunk.TargetContent;
                            let replacement = chunk.ReplacementContent;
                            
                            if (newContent.includes(target)) {
                                newContent = newContent.replace(target, replacement);
                            } else {
                                console.error(`WARNING: Step ${i} target not found!`);
                                missing = true;
                            }
                        }
                        // Only apply if all chunks were found
                        if (!missing) {
                            content = newContent;
                            console.log(`Step ${i} applied successfully.`);
                        } else {
                            console.error(`Step ${i} skipped due to missing targets.`);
                        }
                    }
                }
            }
        }
    } catch(e) {
        console.error('Error parsing line ' + i, e.message);
    }
}

fs.writeFileSync('C:/Users/TACOMPUTER/.gemini/antigravity/brain/fda1fe34-7c69-4703-a6b1-a7419837633e/scratch/main_replayed.js', content, 'utf8');
console.log('Replay finished.');
