import { FISH_IMAGE_URL } from '../config.js'

// The brand lockup: the real tropical-fish photo in a round frame + wordmark.
export default function FishLogo({ size = 40, withText = true, light = false, stacked = false }) {
  return (
    <div className={`brand ${stacked ? 'brand-stacked' : ''}`}>
      <img
        src={FISH_IMAGE_URL}
        alt="טרופיקל פיש"
        className="brand-fish"
        style={{ width: size, height: size }}
      />
      {withText && (
        <div className={`brand-text ${light ? 'is-light' : ''}`}>
          <span className="brand-name">טרופיקל פיש</span>
          <span className="brand-sub">משמרות סופ״ש</span>
        </div>
      )}
    </div>
  )
}
