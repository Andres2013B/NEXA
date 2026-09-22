import { ImageResponse } from "next/og";
import { StarIcon } from "@/lib/nexa/star-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
        }}
      >
        <StarIcon sizePercent={58} />
      </div>
    ),
    { ...size },
  );
}
