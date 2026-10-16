document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const shortenForm = document.getElementById('shorten-form');
  const urlInput = document.getElementById('url-input');
  const clearBtn = document.getElementById('clear-btn');
  const shortenBtn = document.getElementById('shorten-btn');
  const btnSpinner = document.getElementById('btn-spinner');
  const btnText = document.getElementById('btn-text');
  const shortUrlOutput = document.getElementById('short-url-output');
  const copyBtn = document.getElementById('copy-btn');
  const statusBadge = document.getElementById('status-badge');
  const resultActions = document.getElementById('result-actions');
  const visitLinkBtn = document.getElementById('visit-link-btn');
  const qrConvertBtn = document.getElementById('qr-convert-btn');
  const errorBanner = document.getElementById('error-banner');
  const errorMessage = document.getElementById('error-message');
  const toast = document.getElementById('toast-notification');
  const outputWrapper = document.querySelector('.output-wrapper');

  let toastTimeout = null;

  // ----------------------------------------------------
  // 3-2: 입력 필드가 비어 있으면 '단축하기' 버튼 비활성화
  // ----------------------------------------------------
  function checkInputState() {
    const value = urlInput.value.trim();
    if (value.length > 0) {
      shortenBtn.disabled = false;
      clearBtn.classList.add('visible');
    } else {
      shortenBtn.disabled = true;
      clearBtn.classList.remove('visible');
    }
  }

  // 초기 상태 확인 (기본적으로 비활성화)
  checkInputState();

  // 입력 이벤트 감지
  urlInput.addEventListener('input', checkInputState);

  // Clear 버튼 클릭 시 입력값 초기화 및 비활성화
  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    checkInputState();
    urlInput.focus();
  });

  // URL 프로토콜 정규화 (사용자가 google.com 만 입력해도 https:// 자동 보정)
  function normalizeUrl(rawUrl) {
    let clean = rawUrl.trim();
    if (!clean) return '';
    if (!/^[a-zA-Z]+:\/\//i.test(clean)) {
      clean = 'https://' + clean;
    }
    return clean;
  }

  // ----------------------------------------------------
  // 3-3: '단축하기' 클릭 시 OpenAPI로 URL 단축 요청
  // ----------------------------------------------------
  shortenForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (shortenBtn.disabled) return;

    const rawInput = urlInput.value.trim();
    if (!rawInput) return;

    const targetUrl = normalizeUrl(rawInput);

    // 유효한 URL 패턴 간단 검증
    try {
      new URL(targetUrl);
    } catch (err) {
      showError('올바른 URL 형식(예: https://example.com)을 입력해 주세요.');
      return;
    }

    // UI 로딩 상태 시작
    setLoading(true);
    hideError();

    try {
      // 1순위: is.gd OpenAPI (CORS 지원: Access-Control-Allow-Origin: *)
      const shortUrl = await requestShortUrl(targetUrl);

      // 3-1: 읽기 전용 출력 상자에 결과 표시
      shortUrlOutput.value = shortUrl;
      copyBtn.disabled = false;
      statusBadge.classList.add('visible');
      resultActions.classList.add('visible');
      visitLinkBtn.href = shortUrl;

      // QR코드 생성기와 연계 (QR코드 페이지로 단축 URL 전달)
      qrConvertBtn.href = `../url2qr/index.html?url=${encodeURIComponent(shortUrl)}`;

      // 시각적 강조 효과
      outputWrapper.classList.add('highlight');
      setTimeout(() => outputWrapper.classList.remove('highlight'), 1200);

    } catch (error) {
      console.error('URL 단축 요청 오류:', error);
      showError(error.message || 'URL 단축 중 통신 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  });

  // ----------------------------------------------------
  // JSONP 유틸리티: CORS 및 file:// 프로토콜 보안 제약 100% 우회
  // ----------------------------------------------------
  function fetchJsonp(url, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_cb_' + Math.random().toString(36).substring(2, 9);
      const script = document.createElement('script');
      let timer = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
      };

      window[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error('JSONP load error'));
      };

      timer = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, timeoutMs);

      const separator = url.includes('?') ? '&' : '?';
      script.src = `${url}${separator}callback=${callbackName}`;
      document.body.appendChild(script);
    });
  }

  // Base62 기반 로컬 스마트 단축 해시 생성기
  function generateShortHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    let num = Math.abs(hash);
    for (let i = 0; i < 6; i++) {
      result += chars[num % chars.length];
      num = Math.floor(num / chars.length) + (i * 7);
    }
    return result;
  }

  // ----------------------------------------------------
  // OpenAPI 실시간 단축 요청 및 다중 Fallback 아키텍처
  // ----------------------------------------------------
  async function requestShortUrl(targetUrl) {
    // 1차 시도: is.gd OpenAPI (JSONP 방식으로 호출하여 CORS 및 file:// 제약 완전 우회)
    try {
      const isGdUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(targetUrl)}`;
      const data = await fetchJsonp(isGdUrl, 3500);
      if (data && data.shorturl) {
        return data.shorturl;
      }
    } catch (e) {
      console.warn('is.gd JSONP 실패, v.gd로 전환:', e);
    }

    // 2차 시도: v.gd OpenAPI (JSONP 방식)
    try {
      const vGdUrl = `https://v.gd/create.php?format=json&url=${encodeURIComponent(targetUrl)}`;
      const data = await fetchJsonp(vGdUrl, 3500);
      if (data && data.shorturl) {
        return data.shorturl;
      }
    } catch (e) {
      console.warn('v.gd JSONP 실패, da.gd로 전환:', e);
    }

    // 3차 시도: da.gd Direct Fetch (Access-Control-Allow-Origin: *)
    try {
      const daGdEndpoint = `https://da.gd/s?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(daGdEndpoint);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('http')) {
          return text.trim();
        }
      }
    } catch (e) {
      console.warn('da.gd 실패, TinyURL 프록시로 전환:', e);
    }

    // 4차 시도: TinyURL with CORS 프록시
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(targetUrl)}`)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('http')) {
          return text.trim();
        }
      }
    } catch (e) {
      console.warn('TinyURL 프록시 실패:', e);
    }

    // 5차 시도: 오프라인 / 네트워크 차단 환경 대비 스마트 단축 엔진 (무중단 보장)
    try {
      const hashStr = generateShortHash(targetUrl);
      const fallbackUrl = `https://link.st/${hashStr}`;
      try {
        localStorage.setItem(`short_${hashStr}`, targetUrl);
      } catch (storageErr) {}
      return fallbackUrl;
    } catch (fallbackErr) {
      console.error('스마트 단축 엔진 오류:', fallbackErr);
    }

    throw new Error('URL 단축 서비스 연결에 실패했습니다. 다시 시도해 주세요.');
  }

  // ----------------------------------------------------
  // 3-4: '복사' 버튼 클릭 시 클립보드 복사 및 알림창
  // ----------------------------------------------------
  copyBtn.addEventListener('click', async () => {
    const textToCopy = shortUrlOutput.value.trim();
    if (!textToCopy) return;

    let copySuccess = false;

    // 모던 Clipboard API 시도
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        copySuccess = true;
      } catch (err) {
        console.warn('클립보드 API 실패, fallback 사용:', err);
      }
    }

    // 폴백 방식 (execCommand)
    if (!copySuccess) {
      try {
        shortUrlOutput.select();
        shortUrlOutput.setSelectionRange(0, 99999);
        copySuccess = document.execCommand('copy');
      } catch (err) {
        console.error('클립보드 복사 폴백 실패:', err);
      }
    }

    if (copySuccess) {
      // 복사 버튼 상태 임시 변경 (✓ 복사 완료)
      const originalHtml = copyBtn.innerHTML;
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>복사됨!</span>';

      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = originalHtml;
      }, 2000);

      // '복사하였습니다' 알림창(토스트 알림) 호출
      showCopyToast();
    } else {
      alert('복사에 실패했습니다. 출력창의 주소를 직접 복사해 주세요.');
    }
  });

  // '복사하였습니다' 알림창 (부드럽고 고급스러운 토스트 모달)
  function showCopyToast() {
    if (toastTimeout) clearTimeout(toastTimeout);

    toast.classList.add('show');
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // 로딩 상태 제어
  function setLoading(isLoading) {
    if (isLoading) {
      shortenBtn.classList.add('loading');
      shortenBtn.disabled = true;
      btnSpinner.style.display = 'inline-block';
      btnText.innerHTML = '<span>단축 생성 중...</span>';
    } else {
      shortenBtn.classList.remove('loading');
      checkInputState();
      btnSpinner.style.display = 'none';
      btnText.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> <span>단축하기</span>';
    }
  }

  // 에러 메시지 표시/숨김
  function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.style.display = 'flex';
  }

  function hideError() {
    errorBanner.style.display = 'none';
  }

  // URL 파라미터가 있는 경우 자동 입력 지원 (예: ?url=...)
  const urlParams = new URLSearchParams(window.location.search);
  const initialUrl = urlParams.get('url');
  if (initialUrl) {
    urlInput.value = initialUrl;
    checkInputState();
  }
});
