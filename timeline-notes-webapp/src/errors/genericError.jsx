import React from 'react';
import { useLocation } from 'react-router-dom';

export default function GenericErrorPage() {
    const location = useLocation();
    const errorMessage = location.state && location.state.errorMessage;

    return (
        <div id="error-page">
            <h1>Oops!</h1>
            <p>Sorry, an unexpected error has occurred.</p>
            {errorMessage && <p>{errorMessage}</p>}
        </div>
    );
}