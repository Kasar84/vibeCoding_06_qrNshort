document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app-container');
  const qrForm = document.getElementById('qr-form');
  const urlInput = document.getElementById('url-input');
  const clearBtn = document.getElementById('clear-btn');
  const qrcodeBox = document.getElementById('qrcode-box');
  const qrCard = document.getElementById('qr-card');
  const qrStage = document.getElementById('qr-stage');
  const toast = document.getElementById('toast-notification');

  let qrcodeInstance = null;
  let currentTargetUrl = '';
  let toastTimeout = null;

  // Clear 버튼 표시/숨김 제어
  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim().length > 0) {
      clearBtn.classList.add('visible');
    } else {
      clearBtn.classList.remove('visible');
    }
  });

  // Clear 버튼 클릭 시 입력값 초기화
  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.classList.remove('visible');
    urlInput.focus();
  });

  // URL 정규화 함수 (스캔 시 브라우저가 바로 열리도록 http(s) 없으면 기본 추가)
  function normalizeUrl(input) {
    let raw = input.trim();
    if (!raw) return '';
    // 이미 프로토콜(http, https, ftp 등)이 있는 경우 그대로 반환
    if (/^[a-zA-Z]+:\/\//i.test(raw)) {
      return raw;
    }
    // 도메인 또는 일반 텍스트에 https:// 붙여주기
    return 'https://' + raw;
  }

  // QR 코드 생성 함수
  function generateQRCode(rawText) {
    const finalUrl = normalizeUrl(rawText);
    if (!finalUrl) return;

    currentTargetUrl = finalUrl;

    // 기존 QR 내용 비우기
    qrcodeBox.innerHTML = '';

    // QRCode 인스턴스 생성
    qrcodeInstance = new QRCode(qrcodeBox, {
      text: finalUrl,
      width: 240,
      height: 240,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

    // 뷰포트 상태를 QR 활성화 모드로 전환:
    // URL 입력창이 화면 하단으로 부드럽게 이동하고 중앙에 QR코드가 나타남
    if (!appContainer.classList.contains('has-qr')) {
      appContainer.classList.add('has-qr');
      qrStage.setAttribute('aria-hidden', 'false');
    }

    // 입력 필드에 보정된 URL 반영 (원하는 경우)
    if (!urlInput.value.startsWith('http://') && !urlInput.value.startsWith('https://')) {
      urlInput.value = finalUrl;
      clearBtn.classList.add('visible');
    }
  }

  // 폼 제출 이벤트 핸들러
  qrForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputVal = urlInput.value.trim();
    if (!inputVal) {
      urlInput.focus();
      return;
    }
    generateQRCode(inputVal);
  });

  // QR 코드 클릭 시 JPG 다운로드 핸들러
  qrCard.addEventListener('click', () => {
    downloadQRAsJPG();
  });

  // QR 코드를 고화질 JPG 파일로 변환하여 저장 경로 선택 및 다운로드
  async function downloadQRAsJPG() {
    const canvas = qrcodeBox.querySelector('canvas');
    const img = qrcodeBox.querySelector('img');

    if (!canvas && !img) {
      alert('생성된 QR 코드가 없습니다. URL을 먼저 입력해 주세요.');
      return;
    }

    // 시각적 피드백: 바운스 효과
    qrCard.style.transform = 'scale(0.96)';
    setTimeout(() => {
      qrCard.style.transform = '';
    }, 150);

    // 고해상도 오프스크린 캔버스 준비 (여백 포함 400x400)
    const exportCanvas = document.createElement('canvas');
    const exportSize = 400;
    const padding = 36;
    const qrDrawSize = exportSize - padding * 2;

    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const ctx = exportCanvas.getContext('2d');

    // 1. JPG는 투명도를 지원하지 않으므로 순백색 배경(#ffffff)을 칠해줌
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportSize, exportSize);

    // 2. 실제 QR 소스 엘리먼트 획득
    const getSourceElement = () => {
      if (img && img.src && (img.naturalWidth > 0 || img.complete)) {
        return img;
      }
      if (canvas && canvas.width > 0) {
        return canvas;
      }
      if (img && img.src) {
        return img;
      }
      return null;
    };

    const source = getSourceElement();
    if (!source) {
      alert('QR 코드를 준비 중입니다. 잠시 후 다시 클릭해 주세요.');
      return;
    }

    // 이미지가 아직 로드되지 않은 상태라면 onload 대기
    if (source.tagName === 'IMG' && (!source.complete || source.naturalWidth === 0)) {
      await new Promise((resolve) => {
        source.onload = resolve;
        setTimeout(resolve, 500);
      });
    }

    // 소스를 오프스크린 캔버스에 렌더링
    try {
      ctx.drawImage(source, padding, padding, qrDrawSize, qrDrawSize);
    } catch (e) {
      console.error('캔버스 드로우 에러:', e);
    }

    // 파일명 생성
    const filenameDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `qrcode_${filenameDate}_${Math.floor(Math.random() * 1000)}.jpg`;

    // 3. Blob 생성 (JPG 품질 0.95)
    const blob = await new Promise((resolve) => {
      if (exportCanvas.toBlob) {
        exportCanvas.toBlob(resolve, 'image/jpeg', 0.95);
      } else {
        const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        resolve(new Blob([ab], { type: mimeString }));
      }
    });

    if (!blob) {
      alert('이미지 생성에 실패했습니다.');
      return;
    }

    // 4. 저장할 경로 창 띄우기: File System Access API (showSaveFilePicker) 우선 시도
    // 사용자가 원하는 폴더(경로)와 파일명을 직접 지정하여 저장할 수 있는 대화상자가 표시됩니다.
    if (window.showSaveFilePicker) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'JPEG Image',
            accept: {
              'image/jpeg': ['.jpg', '.jpeg']
            }
          }]
        });

        const writableStream = await fileHandle.createWritable();
        await writableStream.write(blob);
        await writableStream.close();

        // 저장 완료 토스트 표시
        showToast();
        return;
      } catch (err) {
        // 사용자가 파일 저장 대화상자에서 '취소'를 누른 경우
        if (err.name === 'AbortError') {
          return;
        }
        console.warn('showSaveFilePicker 제한 또는 미지원, 다운로드 방식으로 전환:', err);
      }
    }

    // 5. 기본 다운로드 폴백: URL.createObjectURL을 통한 Blob 다운로드
    // 브라우저의 다운로드 설정("각 파일의 저장 위치 확인")에 따라 저장할 경로 대화상자가 뜨거나 저장됩니다.
    try {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 1000);

      // 다운로드 완료 토스트 표시
      showToast();
    } catch (e) {
      console.error('Blob 다운로드 실패, DataURL 폴백:', e);
      const jpgDataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = filename;
      link.href = jpgDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast();
    }
  }

  // 토스트 알림 표시 함수
  function showToast() {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    toast.classList.add('show');
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // 초기 로딩 시 입력창 자동 포커스 및 쿼리 파라미터 자동 생성 처리
  const urlParams = new URLSearchParams(window.location.search);
  const paramUrl = urlParams.get('url');
  if (paramUrl) {
    urlInput.value = paramUrl;
    clearBtn.classList.add('visible');
    generateQRCode(paramUrl);
  } else {
    urlInput.focus();
  }
});

