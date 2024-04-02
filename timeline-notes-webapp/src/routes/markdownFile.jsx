import React, { useState, useEffect } from 'react';
import { micromark } from 'micromark';
import { gfmFootnote, gfmFootnoteHtml } from 'micromark-extension-gfm-footnote';
import { useParams } from 'react-router-dom';
import CodeMirrorEditor from '../components/CodeMirrorEditor';
import config from '../config';
import '../styles/MarkdownFile.css'

export default function MicromarkFile() {

    // Markdown file as a string, used for update detection
    const [markdownString, setMarkdownString] = useState('');
    // Markdown file as HTML, used for display
    const [outputHtml, setOutputHtml] = useState('');

    const { parent, file } = useParams();

    // get name of parent folder

    // on mount, retrieve the Markdown file
    useEffect(() => {        
        const fetchMarkdown = async () => {
            try {
                const mdURL = config.backendBaseUrl + `serve/getMarkdown/${parent}/${file}`
                const response = await fetch(mdURL);
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
    }, [parent, file]);




    // on mount and whenever the Markdown string changes, convert it to HTML
    useEffect(() => {

        // Define a custom function to replace image links with <img> tags
        const replaceImageLinks = (markdownContent) => {
        
            // Regular expression to match Markdown image syntax: ![alt text](image URL)
            const imageLinkRegex = /!\[.*?\]\((.*?)\)/g;
        
            // Replace image links with <img> tags pointing to S3 URLs
            const modifiedMarkdown = markdownContent.replace(imageLinkRegex, (match, imageUrl) => {
                // Extract the image name from the URL
                let imageName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);

                console.log(file + '/' + imageName)
                // add parent folder
                // Construct the S3 URL based on your bucket URL and the image name
                const s3Url = config.backendBaseUrl +  `serve/getImage/${file}/${imageName}`;
                const encodedURL = s3Url.replace(/ /g, '%20');
                return `![alt text](${encodedURL})`;
            });
        
            return modifiedMarkdown;
        };

        const modifiedMarkdown = replaceImageLinks(markdownString);

        const output = micromark(modifiedMarkdown, {
            extensions: [gfmFootnote()],
            htmlExtensions: [gfmFootnoteHtml()]
        });

        const regexPattern = /\((.*?)\)\[(.*?)\]\{(.*?)\}\{(.*?)\}/g;
        // Replace matches using a custom function
        const linkedTimelines = output.replace(regexPattern, (match, linkText, url, startDate, endDate) => {
            // Construct the HTML anchor tag with the extracted values
            // TODO fix this so it works again
            const timelineURL = config.frontendBaseURL + "timeline/" + url
            const htmlAnchorTag = `<a href="${timelineURL}">${linkText}</a>`;
            return htmlAnchorTag;
        });

        // make internal links open new tabs when clicked
        const modifiedHtmlContent = linkedTimelines.replace(/<a\s+(?:[^>]*)>/gi, '<a target="_blank" $&');

        setOutputHtml(modifiedHtmlContent);
    }, [markdownString, file]);

    // when the Markdown editor changes, update the Markdown string
    const handleMarkdownChange = (newValue) => {
        console.log('Markdown changed:');
        setMarkdownString(newValue);
    };

    const handleSaveMarkdown = async () => {

        let response;

        try {

            const blob = new Blob([markdownString], { type: 'text/plain' });

            const formData = new FormData();
            formData.append('file', blob, file);

            const uploadURL = config.backendBaseUrl + `save/markdown/${parent}`

            const jwtToken = localStorage.getItem('token')

            const headers = new Headers()
            headers.append('Authorization', `Bearer ${jwtToken}`)

            response = await fetch(uploadURL, {
                method: 'POST',
                headers: headers,
                body: formData,
            });

            if (!response.ok) {
                if(response.status === 401) {
                    alert("admin only, please login")
                }
                throw new Error(`Failed to save Markdown file (status ${response.status})`);
            }

            console.log('Markdown file saved successfully!');
        } catch (error) {
            console.error('Error saving Markdown file:', error.message);
        }

        if (response) {
            try {
                const responseData = await response.json();
                if (responseData && responseData.error) {
                    console.error('Error from backend:', responseData.error);
                    alert(`Error: ${responseData.error}`);
                }
            } catch (jsonError) {
                console.error('Error parsing JSON:', jsonError.message);
                // Handle parsing error gracefully
            }
        }
    
        

    };

    return (
        <div>
            <h1>Markdown File</h1>

            <CodeMirrorEditor initialValue={markdownString} handleChange={handleMarkdownChange} />

            <button onClick={handleSaveMarkdown}>Save Markdown</button>

            <h1>Markdown Preview</h1>
            <div className='markdownHTML' dangerouslySetInnerHTML={{ __html: outputHtml }} />
        </div>
    );
}