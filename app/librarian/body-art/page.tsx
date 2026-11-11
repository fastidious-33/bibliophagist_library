import type { Metadata } from 'next';
import Image from 'next/image';
import RoomPage from '@/components/RoomPage';
import {
  BODY_ART_INTRO,
  BODY_ART_PS,
  DREAM_INKS,
  DREAM_INKS_INTRO,
  FIRST_TATTOO,
  SECOND_TATTOO,
  type Ink,
} from '@/lib/librarian';

export const metadata: Metadata = {
  title: 'Body art',
  description: 'The librarian’s tattoos, and the ones still to come. Most of them are about books.',
};

function InkPhoto({ ink }: { ink: Ink }) {
  return (
    <figure className="ink-photo">
      <Image src={ink.src} width={ink.width} height={ink.height} alt={ink.alt} sizes="(max-width: 760px) 100vw, 420px" />
    </figure>
  );
}

export default function BodyArtPage() {
  return (
    <RoomPage title="Body art" slot="librarianBodyArt" intro={BODY_ART_INTRO}>
      <section className="subsection" aria-labelledby="first-tattoo-heading">
        <h2 id="first-tattoo-heading" className="subhead">
          My first tattoo
        </h2>
        <div className="ink-row">
          <InkPhoto ink={FIRST_TATTOO.image} />
          <div>
            {FIRST_TATTOO.text.map((para) => (
              <p key={para} className="prose">
                {para}
              </p>
            ))}
            <p className="prose">
              I really recommend my tattoo artist,{' '}
              <a href={FIRST_TATTOO.artist.url} target="_blank" rel="noopener noreferrer">
                {FIRST_TATTOO.artist.name} ({FIRST_TATTOO.artist.handle})
              </a>
              . {FIRST_TATTOO.artistNote}
            </p>
          </div>
        </div>
      </section>

      <section className="subsection" aria-labelledby="second-tattoo-heading">
        <h2 id="second-tattoo-heading" className="subhead">
          The second one
        </h2>
        <InkPhoto ink={SECOND_TATTOO} />
      </section>

      <section className="subsection" aria-labelledby="dream-inks-heading">
        <h2 id="dream-inks-heading" className="subhead">
          Dream inks
        </h2>
        <p className="prose">{DREAM_INKS_INTRO}</p>
        <ul className="dream-inks">
          {DREAM_INKS.map((idea) => (
            <li key={idea}>{idea}</li>
          ))}
        </ul>
      </section>

      <p className="room-note">{BODY_ART_PS}</p>
    </RoomPage>
  );
}
