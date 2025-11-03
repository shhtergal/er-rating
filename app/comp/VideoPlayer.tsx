import React from "react";

interface Attr {
  src: string;
}

const VideoPlayer: React.FC<Attr> = ({ src }) => {
  return (
    <div style={{ textAlign: "center" }}>
      <video width="640" height="360" controls>
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
