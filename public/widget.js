(function() {
  // Prevent multiple initializations
  if (window.NexTimeChatWidget) return;
  window.NexTimeChatWidget = true;

  // Derive the backend URL from this script's src attribute
  var scriptTag = document.currentScript;
  var scriptUrl = scriptTag ? scriptTag.src : 'https://vibeproject.online/widget.js';
  var backendUrl = scriptUrl.replace('/widget.js', '');

  // Default config
  var config = {
    color: '#10b981', // green default
    position: 'right', // 'left' or 'right'
    zIndex: 999999,
  };

  // Create Container
  var container = document.createElement('div');
  container.id = 'nextime-chat-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style[config.position] = '20px';
  container.style.zIndex = config.zIndex;
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = config.position === 'right' ? 'flex-end' : 'flex-start';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  document.body.appendChild(container);

  // Create Iframe Container (hidden by default)
  var iframeContainer = document.createElement('div');
  iframeContainer.style.display = 'none';
  iframeContainer.style.width = '350px';
  iframeContainer.style.height = '600px';
  iframeContainer.style.maxHeight = '80vh';
  iframeContainer.style.maxWidth = '90vw';
  iframeContainer.style.backgroundColor = 'transparent';
  iframeContainer.style.borderRadius = '16px';
  iframeContainer.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
  iframeContainer.style.marginBottom = '16px';
  iframeContainer.style.overflow = 'hidden';
  iframeContainer.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  iframeContainer.style.opacity = '0';
  iframeContainer.style.transform = 'translateY(20px)';
  container.appendChild(iframeContainer);

  // Create Iframe
  var iframe = document.createElement('iframe');
  iframe.src = backendUrl + '/widget-iframe';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.backgroundColor = '#ffffff'; // in case of transparent background
  iframeContainer.appendChild(iframe);

  // Create Toggle Button
  var button = document.createElement('button');
  button.style.width = '60px';
  button.style.height = '60px';
  button.style.borderRadius = '50%';
  button.style.backgroundColor = config.color;
  button.style.color = '#ffffff';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.transition = 'transform 0.2s ease, background-color 0.2s ease';
  
  // Initial Chat Icon (SVG)
  var chatIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  var closeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  
  button.innerHTML = chatIcon;
  container.appendChild(button);

  // Toggle Logic
  var isOpen = false;
  button.addEventListener('click', function() {
    isOpen = !isOpen;
    if (isOpen) {
      iframeContainer.style.display = 'block';
      // Small timeout to allow display:block to apply before animation
      setTimeout(function() {
        iframeContainer.style.opacity = '1';
        iframeContainer.style.transform = 'translateY(0)';
      }, 10);
      button.innerHTML = closeIcon;
      button.style.transform = 'scale(0.9)';
    } else {
      iframeContainer.style.opacity = '0';
      iframeContainer.style.transform = 'translateY(20px)';
      setTimeout(function() {
        iframeContainer.style.display = 'none';
      }, 300);
      button.innerHTML = chatIcon;
      button.style.transform = 'scale(1)';
    }
  });

  // Handle Hover Effects
  button.addEventListener('mouseenter', function() {
    if (!isOpen) button.style.transform = 'scale(1.05)';
  });
  button.addEventListener('mouseleave', function() {
    if (!isOpen) button.style.transform = 'scale(1)';
  });

  // Listen to messages from iframe (e.g., to close the widget from inside)
  window.addEventListener('message', function(event) {
    if (event.data === 'close-chat-widget' && isOpen) {
      button.click();
    }
  });

})();
