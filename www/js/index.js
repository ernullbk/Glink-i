document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

    const linkInput = document.getElementById('link-input');
    const submitButton = document.getElementById('submit-button');
    const statusMessage = document.getElementById('status-message');

    submitButton.addEventListener('click', () => {
        const apiUrl = linkInput.value.trim();

        [span_0](start_span)// 1. Input validation[span_0](end_span)
        if (!apiUrl) {
            [span_1](start_span)updateStatus('لطفا لینک را وارد کنید.', 'error');[span_1](end_span)
            return;
        }

        [span_2](start_span)// 2. Set loading state[span_2](end_span)
        updateStatus('در حال بارگذاری...', 'loading');
        submitButton.disabled = true;

        // 3. Fetch data from the provided URL
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    [span_3](start_span)throw new Error('api_error'); //[span_3](end_span)
                }
                return response.json(); [span_4](start_span)//[span_4](end_span)
            })
            .then(data => {
                if (!data || typeof data.JWT !== 'string') {
                    [span_5](start_span)throw new Error('api_error'); //[span_5](end_span)
                }

                // 4. On success, open InAppBrowser and inject script
                updateStatus('در حال هدایت به اسنپ‌فود...', 'success');
                handleLogin(data.JWT);
            })
            .catch(error => {
                // 5. Handle errors
                if (error.message === 'Failed to fetch') {
                    [span_6](start_span)updateStatus('اتصال اینترنت را بررسی کنید.', 'error'); //[span_6](end_span)
                } else {
                    updateStatus('لینک وارد شده نادرست است.', 'error'); [span_7](start_span)//[span_7](end_span)
                }
                submitButton.disabled = false;
            });
    });
}

function handleLogin(jwtString) {
    const targetUrl = 'https://m.snappfood.ir/';
    // Open the website in the InAppBrowser
    const browser = cordova.InAppBrowser.open(targetUrl, '_blank', 'location=yes,clearcache=yes,clearsessioncache=yes');

    browser.addEventListener('loadstop', () => {
        const jwtData = JSON.parse(jwtString);
        
        // This script will run inside the InAppBrowser's context
        // It checks the domain and sets cookies or localStorage accordingly
        const injectionScript = `
            (function() {
                const hostname = window.location.hostname;
                const jwtData = ${JSON.stringify(jwtData)}; // Pass data safely into the script

                // This logic is from your background.js file
                if (hostname === 'm.snappfood.ir') {
                    [span_8](start_span)// Set Cookies[span_8](end_span)
                    document.cookie = "jwt-access_token=" + jwtData.access_token + ";path=/";
                    document.cookie = "jwt-token_type=" + jwtData.token_type + ";path=/";
                    document.cookie = "jwt-refresh_token=" + jwtData.refresh_token + ";path=/";
                    document.cookie = "jwt-expires_in=" + jwtData.expires_in + ";path=/";
                    document.cookie = "UserMembership=0;path=/";
                } else if (hostname === 'food.snapp.ir') {
                    [span_9](start_span)[span_10](start_span)// Set localStorage[span_9](end_span)[span_10](end_span)
                    localStorage.setItem('JWT', JSON.stringify(jwtData));
                }

                // Reload the page to apply the login session
                window.location.reload(true);
            })();
        `;

        browser.executeScript({ code: injectionScript }, () => {
            console.log('JWT and cookies injected successfully.');
        });
    });

    browser.addEventListener('exit', () => {
        // Reset the UI when the user closes the browser
        const submitButton = document.getElementById('submit-button');
        const linkInput = document.getElementById('link-input');
        linkInput.value = '';
        submitButton.disabled = false;
        updateStatus('', 'default');
    });
}

function updateStatus(message, type) {
    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = message;
    statusMessage.className = 'status-' + type; // for styling
}

