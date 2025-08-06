document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    const processBtn = document.getElementById('processBtn');
    const apiUrlInput = document.getElementById('apiUrl');
    const statusDiv = document.getElementById('status');
    const targetUrl = 'https://m.snappfood.ir/';

    processBtn.addEventListener('click', () => {
        const apiUrl = apiUrlInput.value.trim();
        if (!apiUrl) {
            updateStatus('لطفا لینک را وارد کنید.', true);
            return;
        }
        processLink(apiUrl);
    });

    function updateStatus(message, isError = false) {
        statusDiv.innerText = message;
        statusDiv.style.color = isError ? '#e74c3c' : '#2ecc71';
    }

    function setButtonState(isLoading) {
        processBtn.disabled = isLoading;
        processBtn.innerText = isLoading ? 'در حال پردازش...' : 'ارسال';
    }

    async function processLink(apiUrl) {
        setButtonState(true);
        updateStatus('در حال دریافت اطلاعات از لینک...');

        try {
            const response = await cordova.plugin.http.sendRequest(apiUrl, { method: 'get' });
            
            const data = JSON.parse(response.data);
            if (!data.JWT || typeof data.JWT !== 'string') {
                throw new Error('فرمت پاسخ اولیه نامعتبر است یا کلید JWT وجود ندارد.');
            }
            
            const jwtData = JSON.parse(data.JWT);

            updateStatus('اطلاعات دریافت شد، در حال تنظیم کوکی‌ها...');
            
            // تابع کمکی که setCookie را به یک Promise تبدیل می‌کند
            function setCookieAsync(name, value) {
                return new Promise((resolve, reject) => {
                    const cookieString = `${name}=${value}; path=/;`;
                    // فراخوانی صحیح تابع با ارسال دو callback برای موفقیت و شکست
                    cordova.plugin.http.setCookie(targetUrl, cookieString, resolve, reject);
                });
            }

            // استفاده از تابع کمکی برای تنظیم تمام کوکی‌ها
            await Promise.all([
                setCookieAsync('jwt-access_token', jwtData.access_token),
                setCookieAsync('jwt-token_type', jwtData.token_type),
                setCookieAsync('jwt-refresh_token', jwtData.refresh_token),
                setCookieAsync('jwt-expires_in', String(jwtData.expires_in)), // تبدیل به رشته برای اطمینان
                setCookieAsync('UserMembership', '0')
            ]);
            
            updateStatus('انجام شد! در حال انتقال به اسنپ‌فود...');
            
            window.location.href = targetUrl;

        } catch (error) {
            console.error(JSON.stringify(error));
            let detailedErrorMessage = 'خطای ناشناخته. لطفا دوباره تلاش کنید.';

            if (error && error.status) {
                detailedErrorMessage = `خطا در اتصال به سرور (کد: ${error.status}). لینک ممکن است نامعتبر باشد.`;
            } else if (error && error.message) {
                detailedErrorMessage = `خطا در پردازش: ${error.message}`;
            }
            updateStatus(detailedErrorMessage, true);
            setButtonState(false);
        }
    }
}
