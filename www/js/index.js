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

    // تابع اصلی بدون تغییر باقی می‌ماند
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
            
            // فراخوانی تابع جدید برای تنظیم کوکی‌ها به صورت ترتیبی
            setCookiesSequentially(jwtData);

        } catch (error) {
            console.error(JSON.stringify(error));
            let detailedErrorMessage = 'خطای ناشناخته. لطفا دوباره تلاش کنید.';
            if (error && error.status) {
                detailedErrorMessage = `خطا در اتصال به سرور (کد: ${error.status}).`;
            } else if (error && error.message) {
                detailedErrorMessage = `خطا در پردازش: ${error.message}`;
            }
            updateStatus(detailedErrorMessage, true);
            setButtonState(false);
        }
    }

    // ================== بخش کاملاً جدید و اصلاح شده ==================
    // این تابع کوکی‌ها را یک به یک و به صورت تو در تو تنظیم می‌کند
    function setCookiesSequentially(jwtData) {
        const cookies = [
            { name: 'jwt-access_token', value: jwtData.access_token },
            { name: 'jwt-token_type', value: jwtData.token_type },
            { name: 'jwt-refresh_token', value: jwtData.refresh_token },
            { name: 'jwt-expires_in', String(jwtData.expires_in) },
            { name: 'UserMembership', value: '0' }
        ];

        let index = 0;

        function setNextCookie() {
            // اگر تمام کوکی‌ها تنظیم شده باشند، به سایت منتقل شو
            if (index >= cookies.length) {
                updateStatus('انجام شد! در حال انتقال به اسنپ‌فود...');
                window.location.href = targetUrl;
                return;
            }

            const cookie = cookies[index];
            const cookieString = `${cookie.name}=${cookie.value}; path=/;`;
            
            const onSuccess = () => {
                console.log(`Cookie '${cookie.name}' set successfully.`);
                index++;
                setNextCookie(); // کوکی بعدی را تنظیم کن
            };

            const onFailure = (error) => {
                console.error(`Failed to set cookie '${cookie.name}':`, JSON.stringify(error));
                updateStatus(`خطا در تنظیم کوکی: ${cookie.name}`, true);
                setButtonState(false);
            };
            
            // فراخوانی صحیح تابع با ارسال دو callback برای موفقیت و شکست
            cordova.plugin.http.setCookie(targetUrl, cookieString, onSuccess, onFailure);
        }

        // شروع فرآیند تنظیم اولین کوکی
        setNextCookie();
    }
    // ===============================================================
}
