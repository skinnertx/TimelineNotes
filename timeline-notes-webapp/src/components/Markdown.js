import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';

const MarkdownViewer = () => {
  const [markdownContent, setMarkdownContent] = useState('');
  const { file } = useParams();

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/getfile/' + file);

        if (!response.ok) {
          throw new Error(`Failed to fetch Markdown file (status ${response.status})`);
        }

        const markdownText = await response.text();
        setMarkdownContent(markdownText);
      } catch (error) {
        console.error('Error fetching Markdown file:', error.message);
      }
    };

    fetchMarkdown();
  }, []); // Empty dependency array means this effect runs once on component mount

  return (
    <div>
      <ReactMarkdown>{markdownContent}</ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;