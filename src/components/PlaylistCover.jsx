import { MusicNotes } from '@phosphor-icons/react'
import { artworkOf, resolvePlaylistTracks } from '../lib/api'

export default function PlaylistCover({ playlist, songs, className = '' }) {
  const tracks = resolvePlaylistTracks(playlist, songs).slice(0, 4)

  return (
    <div className={`overflow-hidden bg-gradient-to-br from-violet-600/40 to-cyan-500/30 ${className}`}>
      {tracks.length > 0 ? (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2">
          {Array.from({ length: 4 }).map((_, i) => {
            const track = tracks[i]
            return track ? (
              <img key={i} src={artworkOf(track)} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div key={i} className="flex items-center justify-center bg-gradient-to-br from-violet-600/30 to-cyan-500/20">
                <MusicNotes size={18} className="text-white/40" />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <MusicNotes size={26} className="text-white/50" />
        </div>
      )}
    </div>
  )
}
