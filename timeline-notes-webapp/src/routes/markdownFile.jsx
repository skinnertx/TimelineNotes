// TODO
// display markdown file
// allow editing of markdown file
// add custom parsing of markdown file
// editor library:
// https://github.com/Ionaru/easy-markdown-editor#configuration
import React, { useState, useEffect } from 'react';
import {micromark} from 'micromark'
import {gfmFootnote, gfmFootnoteHtml} from 'micromark-extension-gfm-footnote'
import { useParams } from 'react-router-dom';


export default function MicromarkFile() {

    const [markdown, setMarkdown] = useState([]);
    const { file } = useParams();

    useEffect(() => {
        const fetchMarkdown = async () => {
            try {
                const response = await fetch('http://localhost:8080/api/getfile/' + file);
                if (!response.ok) {
                    throw new Error(`Failed to fetch Markdown file (status ${response.status})`);
                }

                const markdownText = await response.text();

                const output = micromark(markdownText, {
                    extensions: [gfmFootnote()],
                    htmlExtensions: [gfmFootnoteHtml()]
                  })

                setMarkdown(output);
            } catch (error) {
                console.error('Error fetching Markdown file:', error.message);
            }
        }

        fetchMarkdown();
    }   , []); // Empty dependency array means this effect runs once on component mount

    return (
        <div>
            <h1>Markdown File</h1>
            <div dangerouslySetInnerHTML={{ __html: markdown}} />
        </div>
    );
}

