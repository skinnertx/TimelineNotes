import config from "../config";
import { useParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';

export default function TimelineViewer() {

        const [timelineData, setTimelineData] = useState();
    
        const { timeline } = useParams();
    
        // get name of parent folder
    
        // on mount, retrieve the Markdown file
        useEffect(() => {        
            const fetchTimeline = async () => {
                try {
                    const tlURL = config.backendBaseUrl + `serve/getTimeline/${timeline}`
                    const response = await fetch(tlURL);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch timeline file (status ${response.status})`);
                    }
    
                    const timelineJson = await response.json();
                    setTimelineData(JSON.stringify(timelineJson, null, 2))
    
                } catch (error) {
                    console.error('Error fetching Timeline file:', error.message);
                }
            };
    
            fetchTimeline();
        }, [timeline]);

        return (
            <pre>{timelineData}</pre>
        )
}