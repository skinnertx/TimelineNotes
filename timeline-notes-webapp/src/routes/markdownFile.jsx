import React, { useState, useEffect } from 'react';
import { micromark } from 'micromark';
import { gfmFootnote, gfmFootnoteHtml } from 'micromark-extension-gfm-footnote';
import { useParams } from 'react-router-dom';
import CodeMirrorEditor from '../components/CodeMirrorEditor';

export default function MicromarkFile() {

    // Markdown file as a string, used for update detection
    const [markdownString, setMarkdownString] = useState('');
    // Markdown file as HTML, used for display
    const [outputHtml, setOutputHtml] = useState('');

    const { file } = useParams();

    // get name of parent folder
    const splits = file.split('.')
    const parentFile = splits[1]

    // on mount, retrieve the Markdown file
    useEffect(() => {
        const fetchMarkdown = async () => {
            try {
                const response = await fetch('http://localhost:8080/api/getfile/' + file);
                if (!response.ok) {
                    throw new Error(`Failed to fetch Markdown file (status ${response.status})`);
                }

                const markdownText = await response.text();
                setMarkdownString(markdownText);

            } catch (error) {
                console.error('Error fetching Markdown file:', error.message);
            }
        };

        fetchMarkdown();
    }, [file]);

    // Define a custom function to replace image links with <img> tags
    const replaceImageLinks = (markdownContent) => {
    
        // Regular expression to match Markdown image syntax: ![alt text](image URL)
        const imageLinkRegex = /!\[.*?\]\((.*?)\)/g;
    
        // Replace image links with <img> tags pointing to S3 URLs
        const modifiedMarkdown = markdownContent.replace(imageLinkRegex, (match, imageUrl) => {
            // Extract the image name from the URL
            let imageName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
            // add parent folder
            // Construct the S3 URL based on your bucket URL and the image name
            const s3Url = `http://localhost:8080/api/getImage/${parentFile}/${imageName}`;
            const encodedURL = s3Url.replace(/ /g, '%20');
            return `![alt text](${encodedURL})`;
        });
    
        return modifiedMarkdown;
    };

    // on mount and whenever the Markdown string changes, convert it to HTML
    useEffect(() => {

        const modifiedMarkdown = replaceImageLinks(markdownString);

        const output = micromark(modifiedMarkdown, {
            extensions: [gfmFootnote()],
            htmlExtensions: [gfmFootnoteHtml()]
        });

        setOutputHtml(output);
    }, [markdownString]);

    // when the Markdown editor changes, update the Markdown string
    const handleMarkdownChange = (newValue) => {
        console.log('Markdown changed:');
        setMarkdownString(newValue);
    };

    const handleSaveMarkdown = async () => {
        try {

            const blob = new Blob([markdownString], { type: 'text/plain' });

            const formData = new FormData();
            formData.append('file', blob, file);

            const response = await fetch('http://localhost:8080/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Failed to save Markdown file (status ${response.status})`);
            }

            console.log('Markdown file saved successfully!');
        } catch (error) {
            console.error('Error saving Markdown file:', error.message);
        }
    };

    return (
        <div>
            <h1>Markdown File</h1>

            <CodeMirrorEditor initialValue={markdownString} handleChange={handleMarkdownChange} />

            <button onClick={handleSaveMarkdown}>Save Markdown</button>

            <h1>Markdown Preview</h1>
            <div dangerouslySetInnerHTML={{ __html: outputHtml }} />
        </div>
    );
}