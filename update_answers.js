const fs = require('fs');

// Correct answers array (1-indexed to match question numbers)
const correctAnswers = ['', 'D','D','B','D','D','C','B','A','B','A','C','B','D','C','D','A','B','A','A','C','B','D','B','A','C','A','B','C','B','D','A','B','B','B','B','A','B','C','A','D','B','A','A','C','D','A','D','B','A','A','B','B','D','C','D','B','D','D','D','A','D','C','B','D','D','C','D','A','C','A','D','A','C','D','A','D','C','C','D','A','B','D','C','A','C','A','D','A','B','C','B','B','D','A','A','D','A','D','B','B','A','D','B','B','A','A','A','C','D','A','B','A','C','C','D','D','C','D','D','D','A','D','D','B','A','B','C','A','A','C','A','A','C','A','C','B','C','C','B','A','C','C','B','C','A','B','D','D','B','A','D','B','D','A','D','C','A','D','D','C','B','D','D','A','A','D','A','D','B','B','C','B','D','D','C','C','B','B','C','A','C','C','D','B','B','B','C','D','C','C','B','B','D','C','C','C','C','B','D','A','A','C','A','D','A','A','B','A','C','C','D','D','B','A','B','B','A','D','D','D','C','C','D','D','A','D','C','B','D','D','B','D','D','A','C','D','C','B','C','C','C','A','D','B','D','D','B','A','D','D','A','A','B','D','D','D','D','C','C','D','B','D','D','A','C','C','A','D','C','C','A','A','B','B','B','B','B','A','B','C','C','C','D','D','C','A','A','A','A','D','D','C','B','C','C','C','C','A','D','D','D','D','A','C','A','B','B','D','A','D','B','D','A','C','C','C','D','C','C','D','A','C','A','C','A','A','A','D','D','C','A','A','B','A','A','B','A','D','C','C','C','A','D','D','B','D','A','A','A','D','B','B','C','A','B','C','A','B','D','B','B','D','A','C','C','A','B','C','A','A','D','D','A','D','B','B','B','D','B','B','A','B','B','A','D','D','A','D','A','D','A','A','B','A','A','B','A','D','C','C','C','C','D','B','B','B','B','A','B','A','D','A','B','C','A','D','A','B','D','B','A','A','C','A','C','C','A','D','C','D','B','A','C','D','A','A','B','C','B','B','D','B','B','B','A','B','A','A','B','B','D','D','D','A','A','B','A','A','A','B'];

// Function to update a chunk file
function updateChunkFile(chunkNumber) {
    const fileName = `public/data/questions_chunk_${chunkNumber.toString().padStart(2, '0')}.json`;
    
    try {
        const data = fs.readFileSync(fileName, 'utf8');
        const questions = JSON.parse(data);
        
        // Update each question in the chunk
        questions.forEach((question, index) => {
            const questionNumber = (chunkNumber - 1) * 5 + index + 1;
            if (questionNumber <= 499 && correctAnswers[questionNumber]) {
                question.answer = correctAnswers[questionNumber];
            }
        });
        
        // Write back to file
        fs.writeFileSync(fileName, JSON.stringify(questions, null, 2));
        console.log(`Updated ${fileName}`);
        
    } catch (error) {
        console.error(`Error updating ${fileName}:`, error);
    }
}

// Update all chunk files
for (let i = 1; i <= 100; i++) {
    updateChunkFile(i);
}

console.log('All answer corrections completed!');
