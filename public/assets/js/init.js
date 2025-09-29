
// Declare all variables globally
//--Notification alarm--//

let notificationBtn;
let notificationCircle;
let notificationNumber;
let notificationList;
let notification;
//--MQTT--//
let topics = {};
//--Profile card--//
let userImg;
let profile;
document.addEventListener('DOMContentLoaded', () => {
    //==Notification Alarm==//
    // DOM elements
    notificationBtn = document.querySelector('.notificationIcon');
    notificationCircle = document.querySelector('.notificationIcon #noticircle');
    notificationNumber = document.querySelector('.notificationIcon #notinumber');
    notificationList = document.getElementById('notificationList');

    // Initialize tippy
    notification = tippy(notificationBtn, {
        content: notificationList,
        allowHTML: true,
        trigger: 'click',
        theme: 'notificationList',
        interactive: true,
        hideOnClick: 'toggle',
    });
    notification.disable();

    //==MQTT==//
    // DOM elements
    const MQTTstatusElement = document.querySelector('.mqtt_status');
    //Initialize MQTT
    fetch('/mqtt-credentials')
      .then(res => res.json())
      .then(cfg => {
        console.log(cfg)
        const client = mqtt.connect(cfg.brokerUrl, {
          clientId: cfg.clientId,
          username: cfg.username,
          password: cfg.password
        });
        
        if (Array.isArray(cfg.topics.pub_topics)) {
            cfg.topics.pub_topics.forEach(t => {
                topics[t.type] = t.topic_pattern;
            });
        }

        topics=cfg.topics;
        client.on('connect', () => {
          MQTTstatusElement.style.backgroundColor = '#4CAF50';
          for (const [type, arr] of Object.entries(topics.sub_topics)) {
            arr.forEach(el => {
              client.subscribe(el, (err) => {
                if (!err) {
                  console.log(`📩 Subscribed to ${type}||topic:${el}`);
                } else {
                  console.log(`❌ Subscribe failed to ${type}||topic:${el}`);
                  console.error('❌ Subscribe error:', err);
                }
              });
            });
          }
          for (const [type, arr] of Object.entries(topics.pubsub_topics)) {
            arr.forEach(el => {
              client.subscribe(el, (err) => {
                if (!err) {
                  console.log(`📩 Subscribed to ${type}||topic:${el}`);
                } else {
                  console.log(`❌ Subscribe failed to ${type}||topic:${el}`);
                  console.error('❌ Subscribe error:', err);
                }
              });
            });
          }
        });

        client.on('reconnect', () => {
          MQTTstatusElement.style.backgroundColor = '#FFC107';
        });

        client.on('close', () => {
          MQTTstatusElement.style.backgroundColor = '#F44336';
        });

        client.on('message', (topic, msgBuffer) => {
          const msg = msgBuffer.toString();
          console.log(msg)
          const parts = topic.split('/');
          const type = parts[0];
          // 🔀 Dispatch to page-specific handler if available
            if (mqttMessageHandler[type]) {
              mqttMessageHandler[type]({ topic, parts, msg, msgBuffer });
            }
        });

        client.on('error', err => {
          console.error('MQTT Error:', err);
        });
    });
    //==Socket.io==//
    // DOM elements
    const mainDiv = document.querySelector('.main');
    //Initialize Socket.io 
    const socket = io(); // connect to socket.io server
    socket.on("forceDisconnect", (data ,ack) => {
      if (ack) ack(); // acknowledge receipt
      mainDiv.style.filter = 'blur(5px)';

      setTimeout(() => {
        alert("You have been kicked out");
        mainDiv.innerHTML = '';
      }, 100); 
      setTimeout(() => {
        window.location.replace("/"); // forces redirect to homepage
      }, 2000);
    });

    socket.on("forceDelete", (data ,ack) => {
      if (ack) ack(); // acknowledge receipt
      mainDiv.style.filter = 'blur(5px)';

      setTimeout(() => {
        alert("You have been kicked out");
        mainDiv.innerHTML = '';
      }, 100); 
      setTimeout(() => {
        window.location.replace("/"); // forces redirect to homepage
      }, 2000);
    });
    
    socket.on("disconnect", (reason) => {
      console.error("Disconnected:", reason);
    });
    //==Profile Card==//
    //DOM elements
    const user = document.querySelector('.user');
    const profile_card = document.querySelector('.profile-card');
    const profileImg = profile_card.querySelector('.profile-image img');
    userImg = document.querySelector('.user img');
    const btnView = document.querySelector(".btn-view");
    const btnLogout = document.querySelector(".btn-logout");
    //Initialize tippy
    tippy(user, {
      content: profile_card,
      allowHTML: true,
      interactive: true,
      trigger: 'click',
      placement: 'bottom',
      theme: 'profile-card',
      animation: 'shift-away',   // smooth slide
      arrow: false,
      onShow(instance) {
      // make sure content is visible when tooltip opens
      instance.props.content.style.display = 'flex';
      },
      onHide(instance) {
        // hide it again when tooltip closes
        instance.props.content.style.display = 'none';
      }
    });
    //Init
    btnView.addEventListener("click", () => {
      window.location.href = "/Profile";
    });

    btnLogout.addEventListener("click", () => {
      if (typeof logout === "function") {
        logout();
      } else {
        console.warn("logout() is not defined!");
      }
    });
    //Fetech for profile info and pic
    (async () => {
      profile = await fetchMyProfileInfo(); //--> My profile info
      document.dispatchEvent(new CustomEvent("MyprofileReady", { detail: profile }));
      // Loop through profile object keys
      Object.entries(profile).forEach(([key, value]) => {
        const el = profile_card.querySelector(`.profile-${key}`);
        if (el) {
          el.textContent = value || "Unknown"; // handle text
        }
      });

      const picUrl = await getMyProfilePicUrl(); //--> My profile picture

      if (picUrl) {
        if (profileImg) profileImg.src = picUrl;
        if (userImg) userImg.src = picUrl;
      } else {
        if (profileImg) profileImg.src = "default.png";
        if (userImg) userImg.src = "default.png";
      }
    })();

    
});


function getTime(ts) {
  if (!ts) return null;

  // ensure proper parsing: SQLite uses "YYYY-MM-DD HH:MM:SS"
  const d = new Date(ts.replace(" ", "T"));

  if (isNaN(d)) {
    console.error("Invalid date:", ts);
    return null;
  }

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

function formatDateTime(ts) {
  const date = new Date(ts);

  const pad = n => String(n).padStart(2, "0");

  const year   = date.getFullYear();
  const month  = pad(date.getMonth() + 1); // months are 0-based
  const day    = pad(date.getDate());
  const hour   = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

