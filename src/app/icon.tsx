import { ImageResponse } from "next/og";
import { StarIcon } from "@/lib/nexa/star-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
        <StarIcon sizePercent={62} />
      </div>
    ),
    { ...size },
  );
}
