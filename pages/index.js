import { useState } from 'react';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import styles from './HomePage.module.css'; // Import the CSS module

function HomePage() {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState(1);
  const [questionsPdfUrl, setQuestionsPdfUrl] = useState('');
  const [answersPdfUrl, setAnswersPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false); // New loading state

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true); // Set loading state to true

    if (numQuestions > 20) {
      alert('The number of questions cannot exceed 20.');
      setIsLoading(false);
      return;
    }

    const difficultyDescription = {
      1: 'very easy, suitable for students in grade school',
      2: 'easy, suitable for students that are in middle school',
      3: 'moderate difficulty, suitable for average adult',
      4: 'challenging, suitable for college students',
      5: 'very challenging, suitable for people with advanced degrees in the field'
    };

    const requestData = {
      model: "gpt-3.5-turbo",
      messages: [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": `Create a worksheet on ${topic || 'general topics'} with ${numQuestions} questions and their respective answers. Each question should be clear and relevant to the topic, and should have a difficulty level of ${difficulty} (${difficultyDescription[difficulty]}). Ensure that the questions are varied and unique each time. Do not include any introductory text or titles. The format should be:
1. Question text
Answer: Answer text
2. Question text
Answer: Answer text
...and so on. Make sure that all questions are of the same format (such as multiple choice) if specified in the topic.`}
      ],
      max_tokens: 1000,
      temperature: 0.9 // Increased temperature for more randomness
    };

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer sk-proj-NbecH2OpJbONaGnVyBhqT3BlbkFJcLZWsdjxf4klB6eABLxz`
        }
      });

      const textData = response.data.choices[0].message.content;
      const { questions, answers } = splitContent(textData);
      generatePDF(questions, topic, 'questions');
      generatePDF(answers, topic, 'answers');
    } catch (error) {
      console.error('Error generating worksheet:', error);
      alert('Failed to generate worksheet. Please try again.');
    } finally {
      setIsLoading(false); // Set loading state to false
    }
  };

  const splitContent = (content) => {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    let questions = [];
    let answers = [];
    let currentQuestionNumber = 0;

    lines.forEach(line => {
      if (line.toLowerCase().includes('sure') || line.toLowerCase().includes('worksheet') || line.toLowerCase().includes('questions')) {
        // Skip introductory lines and titles
      } else if (line.toLowerCase().startsWith('answer:')) {
        currentQuestionNumber++;
        answers.push(`Q${currentQuestionNumber}: ${line.replace('Answer:', '').trim()}`);
      } else {
        questions.push(line.trim());
      }
    });

    return {
      questions: questions.join('\n').trim(), // Join questions into a single string
      answers: answers.join('\n').trim() // Join answers into a single string
    };
  };

  const generatePDF = (content, topic, type) => {
    const pdf = new jsPDF();
    const title = `${topic || 'Worksheet'} - ${type === 'questions' ? 'Questions' : 'Answer Key'}`;
    const margin = 10;
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const maxLineWidth = pageWidth - margin * 2;

    // Add title with larger font size and bold
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, pageWidth / 2, 20, { align: 'center' });

    // Add header line
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 25, pageWidth - margin, 25);

    // Reset font for content
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");

    // Add content with formatting
    const lines = content.split('\n');
    let y = 35;
    lines.forEach(line => {
      const splitText = pdf.splitTextToSize(line, maxLineWidth);
      pdf.text(splitText, margin, y);
      y += splitText.length * 10 + 5; // Adjust spacing between lines

      if (y > pageHeight - 20) {
        pdf.addPage();
        y = 20;
      }
    });

    // Add footer line
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    // Add footer text
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "italic");
    pdf.text("Generated by Worksheet Generator", margin, pageHeight - 10);

    // Generate the PDF as a Blob
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    if (type === 'questions') {
      setQuestionsPdfUrl(url);
    } else {
      setAnswersPdfUrl(url);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1>Welcome to the Worksheet Generator!</h1>
        <p className={styles.blurb}>Create customized worksheets for various topics and difficulty levels. Simply enter a topic, select the number of questions, and choose the difficulty level. Generate and download your worksheets along with answer keys in PDF format.</p>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="topic-input" className={styles.label}>Enter a specific topic (optional):</label>
            <input 
              type="text" 
              id="topic-input" 
              value={topic} 
              onChange={e => setTopic(e.target.value)} 
              placeholder="e.g., Fractions, Grammar Rules"
              className={styles.formControl}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="num-questions" className={styles.label}>Number of questions (optional, default is 10, max is 20):</label>
            <input 
              type="number" 
              id="num-questions" 
              value={numQuestions} 
              onChange={e => setNumQuestions(e.target.value)} 
              min="1"
              max="20" // Set maximum number of questions to 20
              placeholder="10"
              className={styles.formControl}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="difficulty" className={styles.label}>Choose difficulty level (1-5):</label>
            <select id="difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)} className={styles.formControl}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Generate Worksheet</button>
          </div>
        </form>
        {isLoading && <p className={styles.loadingText}>Generating worksheet...</p>}
      </div>

      <div className={styles.pdfContainer}>
        {questionsPdfUrl && (
          <div className={styles.pdfPreview}>
            <h3>Questions PDF</h3>
            <iframe src={questionsPdfUrl}></iframe>
            <div>
              <a href={questionsPdfUrl} download={`Worksheet_Questions.pdf`} className={`${styles.btn} ${styles.btnSecondary}`}>Download Questions PDF</a>
            </div>
          </div>
        )}
        {answersPdfUrl && (
          <div className={styles.pdfPreview}>
            <h3>Answer Key PDF</h3>
            <iframe src={answersPdfUrl}></iframe>
            <div>
              <a href={answersPdfUrl} download={`Worksheet_Answer_Key.pdf`} className={`${styles.btn} ${styles.btnSecondary}`}>Download Answer Key PDF</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
