<template>
  <!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 68

Conversion time: 23.512 seconds.


Using this HTML file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs™ to Markdown version 2.0β2
* Thu May 07 2026 14:40:08 GMT-0700 (Pacific Daylight Time)
* Source doc: No Flag Expert 100% efficiency game review/semi-guide
* Tables are currently converted to HTML tables.
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->

  <p style="color: red; font-weight: bold">
    &gt;&gt;&gt;&gt;&gt; gd2md-html alert: ERRORs: 0; WARNINGs: 0; ALERTS: 68.
  </p>
  <ul style="color: red; font-weight: bold">
    <li>See top comment block for details on ERRORs and WARNINGs.</li>
    <li>
      In the converted Markdown or HTML, search for inline alerts that start
      with &gt;&gt;&gt;&gt;&gt; gd2md-html alert: for specific instances that
      need correction.
    </li>
  </ul>

  <p style="color: red; font-weight: bold">
    Links to alert messages: (removed)
  </p>

  <p style="color: red; font-weight: bold">
    &gt;&gt;&gt;&gt;&gt; PLEASE check and correct alert issues and delete this
    message and the inline alerts.
  </p>
  <hr />
  <p></p>

  <p>
    I’m Llama, a UK minesweeper player who has a lot of experience with no flag
    efficiency.
  </p>
  <p>
    In this document, I will be reviewing
    <a href="https://minesweeper.online/game/3192155452">this game</a>
    which is an 100% NF efficiency expert game I got during the March 2024
    minesweeper.online championship. I hope to provide some insight into the
    decision making that goes on during an NF eff game. I’ve included
    “semi-guide” in the title since I will give extra information/explanations
    when I feel it is appropriate. There are other guides on NF efficiency, so I
    will skip over some of the theory that is already covered in those. I will
    assume a basic-to-intermediate understanding of NF efficiency.
  </p>
  <p class="text-h5">Other guides</p>

  <p>
    Scar and PTTACGFans have made great guides for introducing NF efficiency
  </p>
  <p>
    <a href="https://minesweeper.online/player/401436"
      >Basic No Flag Efficiency Guide</a
    >
    - Scar
  </p>
  <p>
    PTT’s guide is in Chinese, so I’ve also included a link to a google
    translated version, however the translation likely has many mistakes
  </p>
  <p>
    <a
      href="https://docs.google.com/document/d/1NdMOCclwA6D_CSDV2T89OdxetuFYvwrqAVTkg8Pvds4/edit"
    >
      No Flag Efficiency guide
    </a>
    (Chinese) - PTTACGFans
  </p>
  <p>
    <a
      href="https://docs.google.com/document/d/e/2PACX-1vRYT4eWK-bguktLx4aokAhmcS7PNk1zsR8DPEwZNh5DNsthAmXLhlwTsNom8xQzl87YVPO3DIS9N30k/pub"
    >
      Minesweeper tutorial for 100% NF efficiency
    </a>
    (translated to English)
  </p>
  <p class="text-h5">Core NF Eff strategy</p>

  <p>
    Before I start the game review, I want to first go over some core strategy
    and principles that I use when playing. This section turned out to be quite
    long, so feel free to skip ahead.
  </p>
  <p>Most moves fall into two different categories -</p>
  <ul>
    <li>Protected squares</li>

    <li>Opening predictions</li>
  </ul>
  <p>
    <span style="text-decoration: underline">Protected squares</span>
  </p>
  <p>
    The foolproof way to tell if a square is protected is to look at the 8
    surrounding squares and ask yourself - “could this be an opening”. If the
    answer is always no, then the square is protected. This works, however most
    of the time it is overkill. Instead, I look out for the below mine patterns
    (and rotations/reflections).
  </p>
  <p>
    Here, dark grey indicates the area of the board that is already solved* and
    green represents the squares that are protected from being part of an
    opening.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image1.png" class="base-img" />

  <p></p>
  <p>
    <em>
      *The dark grey squares don’t have to be exact, I’ve just included them to
      help show that these mine patterns only protect from openings occurring in
      a particular direction (in the case of this diagram they protect from
      openings coming in from the top right). We still have to be careful when
      looking for possible openings coming from the other direction (in this
      case, the bottom left).
    </em>
  </p>
  <p>
    Sometimes, a combination of the above patterns has to be used. For example,
    green here is protected, since both of the below combinations of mines are
    able to protect it.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image2.png" class="base-img" />

  <p></p>
  <p>
    It’s good to get into the habit of always clicking all of the
    known-to-be-safe protected squares before taking any risks.
  </p>
  <p>
    <span style="text-decoration: underline">Opening predictions</span>
  </p>
  <p>
    There are some general rules/principles that can be used when deciding where
    to go for an opening prediction. The choice depends a lot on what the board
    looks like, so these rules can be broken when it makes sense to do so.
  </p>
  <ol>
    <li>
      <strong
        >The fewer tiles required for a square to be an opening, the
        better.</strong
      >
      Green is better than cyan in the below screenshot as it requires
      <strong>4 squares</strong>
      to be safe in order for it to be an opening whereas cyan requires
      <strong>6 squares</strong>
      to be safe for this.

      <p style="text-align: center"></p>

      <img src="/img/articles/nf-eff-guide/image3.png" class="base-img" />

      <p></p>
    </li>
    <li>
      <strong
        >It is preferable to go for openings where the square you are clicking
        on is known to be safe.</strong
      >
      Here, red is a known mine. Green is better than Cyan as it is known to be
      safe, so you avoid the [mine density]% risk of blasting. You may still
      lose a click if orange is a mine and cyan is an opening. However, this is
      an acceptable risk since the chance of this happening is less than [mine
      density]% since even if orange is a mine, you may still be saved if there
      are mines above it that prevent the opening.

      <p style="text-align: center"></p>

      <img src="/img/articles/nf-eff-guide/image4.png" class="base-img" />

      <p></p>
    </li>
    <li>
      <strong
        >It is preferable to go for moves that can be “pulled” towards solved
        areas.</strong
      >
      Green is better than cyan in the below screenshot. They both have the same
      chance of giving an opening, but if instead they open a number, then green
      would enable you to uncover the yellow squares, and locate the mine(s)
      that are blocking the opening, whereas cyan would just let you uncover the
      brown square, which isn’t as useful. I will discuss “pulling” more later
      on in the document.

      <p style="text-align: center"></p>

      <img src="/img/articles/nf-eff-guide/image5.png" class="base-img" />

      <p></p>
    </li>
    <li>
      <strong
        >Compare moves by thinking about where the mines and openings could be
        that would mess things up.</strong
      >
      It’s possible to go very far with this, as in theory, you could calculate
      all the different probabilities of situations that can arise, and use this
      to weigh up different opening predictions. Most of the time this isn’t
      necessary. In the below screenshot, I consider the green and the cyan
      opening predictions. For the green prediction, I note that there are 2
      (orange) squares that could lose a click if they contain a mine and white
      is an opening. For the cyan prediction, there are 4 (orange) squares that
      could lose a click if they have a mine. So, I would judge green to be
      better than cyan as there are more ways that cyan can waste a click.

      <p style="text-align: center"></p>

      <img src="/img/articles/nf-eff-guide/image6.png" class="base-img" />

      <p></p>
    </li>
    <li>
      <strong>Try to close down the board.</strong>
      This is quite a general principle, so I don’t have a screenshot to go
      along with it. It’s a good idea to try to approach regions of the board
      from all sides as this makes them easier to deal with. Openings have a
      slight tendency to travel along the edge of the board as they require 6
      squares to be safe rather than the usual 9. You can use this to your
      advantage and try to enclose regions of the board. In practice, this can
      be quite hard to do as often you just have to go where the game takes you.
    </li>

    <li>
      <strong>Think about the bigger picture.</strong>
      I wasn’t sure exactly how to phrase this principle, but it is important.
      Cyan here seems like a very natural opening prediction to make. However,
      it provides no additional information about the board, so it could be
      better approached from a different direction. If, after solving the rest
      of the board, we discover that brown is a mine, then cyan can no longer be
      an opening and we would save ourselves from having to take an unnecessary
      [mine density]% risk with cyan. This example is quite specific, however
      the principle applies in lots of different situations. Whenever you make a
      guess, think about how it improves the state of the board - will it help
      solve an important area of the board? Is it likely to lead to lots of
      progress or is it in a closed off area that is better left for minecount?

      <p style="text-align: center"></p>

      <img src="/img/articles/nf-eff-guide/image7.png" class="base-img" />

      <p></p>
    </li>
    <li>
      <strong>Don’t forget about the edge of the board.</strong>
      In particular, I mean moves like in the screenshot below, it’s easy to
      overlook them, but they can rescue you in difficult situations when
      nothing else looks good.
    </li>
  </ol>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image8.png" class="base-img" />

  <p></p>
  <p>
    <span style="text-decoration: underline">Probabilities of openings</span>
  </p>
  <p>
    I stole this table from a Dard
    <a href="https://youtu.be/jKRydA5zqzI?si=JItkJZ_i84LhWluw&amp;t=369"
      >video</a
    >
    . It shows how likely it is for an opening to occur. So, if 3 cells are
    required to be safe for there to be an opening, then it will be an opening
    50% of the time on expert. I’d suggest having a quick look over the table to
    check it matches your intuition.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image9.png" class="base-img" />

  <p></p>
  <p class="text-h5">The mindset</p>

  <p>
    The mindset of no flag efficiency depends on what your goal is. If you are
    dead set on achieving expert 100%, then this will naturally lead to a
    different strategy than if you are aiming for, say, above 95%. When aiming
    for 100%, you should treat losing a click to an opening and clicking on a
    mine as being equivalent. They both require a reset.
  </p>
  <p>
    When aiming for 100%, you may find yourself going hours without having any
    close attempts, so I would encourage you to make the most of any attempts
    that look promising. This means slowing down to avoid misclicks/mistaken
    logic and carefully evaluating the order of which to play moves to minimise
    overall risk taken.
  </p>
  <p>
    I would encourage you to minecount towards the end of games whenever there
    is a chance that knowledge of the minecount may lead to making a different
    decision. I use the paint bucket tool in jspaint for this and I change
    colour every 10 mines. Remember that expert has 99 mines instead of 100, so
    if you are counting in 10s the last batch will have 9 mines - I’ve made this
    mistake before.
  </p>
  <p>
    If we assume that expert NF 100% happens once per 50 hours of playtime, then
    taking an unnecessary 80% safe guess right at the end of a winning game will
    on average set you back by 10 hours.
  </p>
  <p>
    MSCoach has run some simulations with his solver on expert NF 100% Eff. He
    found that it won around 1 in 4,444 games using a 4-corner start (more info
    can be found on his
    <a href="https://minesweeper.online/player/567348">profile</a>
    ).
  </p>
  <p>
    To give a comparison with intermediate - I can get 100% around 1 in every 7
    games on intermediate when playing as carefully as possible. I once did this
    <a href="https://minesweeper.online/winstreak/1611609033"
      >6 times in a row</a
    >
    !
  </p>
  <p class="text-h5">Start of the review</p>

  <p>As a reminder, we will be reviewing this game</p>
  <p>
    <a href="https://minesweeper.online/game/3192155452"
      >https://minesweeper.online/game/3192155452</a
    >
    <br />
    <br />
    It’s a very slow game, so if you want to follow along, I’d suggest using the
    replay stepper. If you have a premium account, this can be activated by
    enabling the “Advanced Replay” in the settings. It gives extra buttons for
    skipping forward moves (left/right arrow keys also work). If you don’t have
    a premium account then arrow keys should still work as long as “use hotkeys”
    is enabled in the settings.
  </p>
  <p style="text-align: center">
    <br />
  </p>

  <img src="/img/articles/nf-eff-guide/image10.png" class="base-img" />

  <p></p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image11.png" class="base-img" />

  <p></p>
  <p>
    I start out the game with 4 corners. I can’t fully recommend this, as
    MSCoach’s simulations suggest that aiming to get an opening in the middle
    before clicking the corners is better in the long run, at the cost of having
    to reset more often. In my other 100%
    <a href="https://minesweeper.online/game/801705135">game</a>
    , I used this middle-opening-then-corners strategy.
  </p>
  <p>
    That said, there is some room for preference in starting strategy, some
    players may find having to reset for a middle opening to be less fun as only
    ~5% of games make it past the starting strategy (compared to 50% for just
    corners). I will note that during the April 2026 NF Eff Championship, many
    players went for just 4 corners or edge opening + 4 corners. One player told
    me that they clicked 4 corners and an edge and only reset if the edge click
    revealed a “1” (noting that a “2” can also lose clicks but they considered
    this an acceptable risk), this strategy may be a happy middle ground option.
    So given that NF Eff 100% games have been won with a variety of starting
    strategies, I can’t give any hard recommendations other than to do 4 corners
    minimum.
  </p>
  <p>
    Putting this all to one side - I have a nice start with an opening in each
    corner. In this case, I click green (screenshot above) and then cyan before
    cleaning up some protected squares. Green is slightly better than cyan since
    there might be a mine in orange (which loses a click if there is an
    opening).
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image12.png" class="base-img" />

  <p></p>
  <p>
    After hitting some openings and cleaning up the protected squares, we end up
    with the above. Green here is the natural choice (safe click + only needs 3
    squares to be an opening). This doesn’t give the opening we wanted, so I’ll
    focus on this area in the next few screenshots.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image13.png" class="base-img" />

  <p></p>
  <p>
    I’ll refer to the above images by their numbers (1-4). In the last move, we
    were hoping to get an opening but ended up with a 1 (shown in purple in the
    first image).
  </p>
  <ol>
    <li>
      The purple 1 could lose us a click. So, we should focus on this area. If
      orange is a mine and black is an opening, then we’d lose a click. We know
      that the mine will be in the orange or yellow squares, and each of these
      will protect green, so we click green.
    </li>

    <li>
      Same idea as the previous step. The purple 1 is still at risk of losing a
      click, but green is protected by orange/yellow in either case, so we click
      green.
    </li>

    <li>
      We are in luck! As the last move revealed a 1, we know where the mine is,
      so there is no longer a risk of losing a click to an opening.
    </li>

    <li>
      We’ve cleaned up the area and can go back to looking at the board as a
      whole
    </li>
  </ol>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image14.png" class="base-img" />

  <p></p>
  <p>
    Guessing green above is the natural and correct choice as it only requires
    the green square and 3 others to be safe in order to be an opening. There is
    also another advantage which is that the top region is very nice since we
    know all the yellow squares are safe, so we are likely to have good follow
    up moves after clicking the green square.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image15.png" class="base-img" />

  <p></p>
  <p>
    I skipped forwards a bit here as there wasn’t much to say about the
    in-between guesses. We now have an obvious safe move here which is green. We
    also have to consider the orange region. Cyan seems like a natural guess to
    solve the orange region. However, the best decision is to leave the orange
    region until the end. It’s a small closed off area, so if we leave it until
    the end and have a high number of mines remaining, then we will want to play
    safe rather than going for cyan.
  </p>
  <p class="text-h5">Preparation guesses</p>

  <p>
    Sometimes, in NF efficiency, there will be times where you may want to get
    more information about the board before going for an opening prediction. I
    want to cover a common example of this before going back to the review.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image16.png" class="base-img" />

  <p></p>
  <p>
    We consider the above example, which happens to be from our game, but we
    will treat this as if it could be from any game (with any density).
  </p>
  <p>You may ask - is it better to go for cyan or green?</p>
  <p>
    <span style="text-decoration: underline">Cyan</span>
  </p>
  <p>
    Cyan is a guess with a [mine density]% chance of blasting (if you want to
    know why this is the case, you should watch Mine Buoy’s
    <a href="https://www.youtube.com/watch?v=At8Kloh4KY4">video</a>
    on probability). The idea behind cyan is that it gives information on
    whether any of the grey squares contain a mine. If cyan reveals a 1, you can
    then click green (hoping for an opening), and if it reveals a 2 or 3 you
    will have to go for a backup guess somewhere else (such as the square
    immediately to the left of green).
  </p>
  <p>
    <span style="text-decoration: underline">Green</span>
  </p>
  <p>
    The idea with green is that whilst it is more immediately risky, it means
    that you only need to take one guess instead of two. Green has a [mine
    density]% chance of blasting just like cyan, but it has extra risk posed by
    the grey squares, as if these contain a mine, then it’s possible for green
    to be on the edge of an opening. Green also requires hoping for a less
    likely opening, this is because green being an opening requires 6 squares to
    be safe, whereas in the good case for cyan (that is where cyan reveals a 1)
    we only need 4 squares to be safe to give an opening.
  </p>
  <p>
    I like to call guesses such as cyan “preparation guesses” because you are
    taking an additional risk in order to (hopefully) improve another guessing
    spot (in this case green).
  </p>
  <p>
    So, which is the better guess? Cyan or green? The answer is that it
    primarily depends on the board density.
  </p>
  <p>
    I’ve done some rough calculations on green and cyan, which inform my
    following commentary on them. There is a section in the appendix where I go
    through my calculations and reasoning in depth. As a reminder, intermediate
    has 15.6% density, and expert has 20.6% density.
  </p>
  <p>
    For densities below 15%, you should choose cyan. This is because at lower
    densities, openings are more common, so the grey squares provide relatively
    more of a threat to the green guess. When the grey squares contain mines,
    it’s quite likely that there will also be an opening to the left of green
    causing it to lose a click. It is worth going for cyan to remove the threat
    posed by the grey squares.
  </p>
  <p>
    For densities in the 15%-20%* range, things are less clear. Green wins out
    in short term survivability, but this is counteracted by the fact that cyan
    is more likely to lead to openings in the short term. I think both guesses
    are within a few percentage points of each other when combining these
    factors, so I can’t outright say which is the better option. For
    intermediate, I tend to choose cyan, but for anything denser I tend to
    choose green as my playstyle is quite heavy on opening predictions (openings
    tend to give a lot of progress, and if a board doesn’t have lots of
    openings, then it’s a bad board).
  </p>
  <p>
    For densities in the 20%-25% range, you should click green because the high
    density means there isn’t as much of a threat of it losing a click to the
    edge of an opening.
  </p>
  <p>
    For densities above 25%, you should start considering other options, such as
    playing safe in the hopes that there are no openings to bump into.
  </p>
  <p>
    <em>
      *I don’t have an exact switching point as this depends on the trade-off
      between likelihood of surviving a guess and likelihood of getting an
      opening, which is hard to put a number on.
    </em>
  </p>
  <p>
    I’d sum up my advice on preparation guesses as follows: look out for them,
    favour them on low densities or when the guess itself has low risk or gives
    a large amount of information, but be wary of the fact that you are taking
    an additional risk that may lead to no real progress.
  </p>
  <p class="text-h5">Back to the review</p>

  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image17.png" class="base-img" />

  <p></p>
  <p>
    We skip forwards again here. There isn’t much to say about the intermediate
    guesses as they all fall into the category of clicking the square which is
    most likely to be an opening and then cleaning up afterwards when it isn’t
    an opening.
  </p>
  <p>
    We are now in a tricky spot. There are no good moves to make. The green
    guess is a wall click which requires the 6 squares in total to be safe in
    order to be an opening. It also is risky as there is a chance green is on
    the edge of an opening if either orange square is a mine. We still go for
    this wall click as it could give a lot of progress if it is an opening.
    Since it is on the edge, it is possible for the opening to travel along the
    edge of the board and help enclose it which would be very useful.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image18.png" class="base-img" />

  <p></p>
  <p>
    We are in a sticky situation again. If we are to play for an opening then
    any of the cyan squares will be natural choices. Perhaps the top-left cyan
    square would be the best guess of this nature. It was not the move I took.
  </p>
  <p>
    I instead went for the green square, which is safe to click, but could be on
    the edge of an opening (e.g. if white was an opening).
  </p>
  <p>
    In the context of aiming for 100%, this is a bad move. One way to see this
    is to look at the purple square to the left of green. Clicking purple will
    always be better than clicking green as there could be situations where
    green loses a click but purple doesn’t.
  </p>
  <p>
    So why did I go for the green square? The answer is that the game was played
    during the NF eff championship and I hadn’t yet fully committed to going for
    100%. The green square was an option that had no risk of blasting and would
    only lose a single click if the white square above was an opening.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image19.png" class="base-img" />

  <p></p>
  <p>
    Here, we have a few different options. We could guess cyan, or either green
    square. All 3 options are equally as likely to be an opening. Cyan is
    slightly safer than green when considering immediate risk as there are more
    ways that the green guesses could be on the edge of an opening. However, I
    discounted the cyan guess as it doesn’t have good follow-up moves if it does
    not reveal an opening.
  </p>
  <p>
    Both of the green guesses have good options if they do not reveal an
    opening.
  </p>
  <p>
    In the case of guess A, we can reveal the yellow squares if we do not get an
    opening *.
  </p>
  <p>
    In the case of guess B, we can reveal the yellow squares and also the brown
    squares *.
  </p>
  <p>
    <em>
      * It may not be obvious why the yellow/brown squares can be clicked as
      follow-up squares. I explain more about the reasoning of this in the next
      section.
    </em>
  </p>
  <p>
    So guess B is better as while it is equal to A in most ways, it lets us
    reveal more squares in the case where it doesn’t reveal an opening.
  </p>
  <p>
    For reasons I can’t remember, but most likely because I was playing fast, I
    went for guess A, which gave a nice opening.
  </p>
  <p class="text-h5">
    Pulling and the rule of treating clicked squares as mines
  </p>

  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image20.png" class="base-img" />

  <p></p>
  <p>
    Let’s consider the above situation more closely, assuming that we just
    revealed the pink 1.
  </p>
  <p>
    There is a mental shortcut that can be used in this situation which only
    applies when playing for 100% efficiency. The mental shortcut is that you
    can pretend that the square you clicked on is a mine. Here a clicked square
    refers to a square that was clicked on individually rather than being part
    of an opening.
  </p>
  <p>
    I’ll show this with diagrams first before explaining the logic behind this.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image21.png" class="base-img" />

  <img src="/img/articles/nf-eff-guide/image22.png" class="base-img" />

  <p></p>
  <p>
    First consider the image on the left. It should be easy to see in this case
    that the mines protect all the yellow squares. These squares cannot be part
    of an opening.
  </p>
  <p>
    Now consider the image on the right. Using the mental shortcut, my claim is
    that the exact same yellow squares are still protected. This turns out to be
    true, but only under the assumption that we are playing for 100%.
  </p>
  <p>
    Why does this work? One way to understand this is to realise that when we
    are going for 100%, mines and clicked squares interact with openings in the
    same way. The “zero” tile of an opening can never be next to a mine (because
    then it wouldn’t be a “zero” tile). Similarly, the zero tile can never be
    next to a clicked square (purple in the diagram) as otherwise we would have
    already lost a click to an opening (which is equivalent to losing the game
    when going for 100%).
  </p>
  <p>
    An alternate way to phrase this is - suppose we click on the yellow squares
    and they do happen to be on the edge of an opening losing us clicks, this
    would be acceptable as it means we have already lost a click with the
    clicked square (purple) so we were never going to get 100% on this board
    anyway.
  </p>
  <p class="text-h5">Back to the review</p>

  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image23.png" class="base-img" />

  <p></p>
  <p>Here I would judge the guesses as follows:</p>
  <p>
    Cyan is safer as it is less likely to be touching an opening, but it is a
    bit out of the way and doesn’t have very good follow-up moves if it doesn’t
    give an opening.
  </p>
  <p>
    Green is a bit riskier as there could be an opening above it or
    below-and-to-the-right of it. But green is more centre-of-the-action and has
    good follow-up moves.
  </p>
  <p>I chose green in this case, although both of these guesses are good.</p>
  <p>
    You may also ask the question - would the square directly above green be a
    good choice to click. I’ll show below that the square directly above green
    has a notable disadvantage.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image24.png" class="base-img" />

  <img src="/img/articles/nf-eff-guide/image25.png" class="base-img" />

  <p></p>
  <p>
    The green guess and cyan guess both have 3* threatening openings (white and
    grey). These are places where bad openings could be that cause the guess to
    lose a click. However, cyan is slightly worse as the grey opening is more
    likely to happen for cyan than it is for green. The cyan-grey opening
    requires 6 safe squares to happen whilst the green-grey opening requires 9
    safe squares to happen.
  </p>
  <p>
    <em>
      * Technically, the white-right opening can be ignored as it’s only
      possible for the white-right square to be an opening if white-left is also
      an opening.
    </em>
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image26.png" class="base-img" />

  <p></p>
  <p>
    After cleaning up from the previous move which failed to yield an opening,
    we get the above.
  </p>
  <p>
    The correct move for 100% is to click the green squares using the rule of
    “treating clicked squares as mines”. In this case, we’d treat the purple
    square as the clicked square.
  </p>
  <p>
    Instead, I ended up going for the cyan square. Why? I still wasn’t fully
    committed to going for 100%. Whilst green is the correct for 100%, it is
    possible that it could transform a 1-click-loss situation into a
    multiple-click-loss situation. Also, the green squares don’t give very good
    information.
  </p>
  <p>There are only two likely outcomes from playing the green squares:</p>
  <ul>
    <li>We learn that we have wasted a click with purple</li>

    <li>
      We learn that we are still on track for 100% but haven’t gained much
      information so we’d still end up guessing cyan.
    </li>
  </ul>
  <p>
    So as the route to 100% is likely to involve guessing cyan, we might as well
    just guess it now.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image27.png" class="base-img" />

  <p></p>
  <p>
    Skipping ahead again, we have the above situation. Blue and cyan are all
    decent guesses although they all have the drawback of not having good
    follow-up moves in the cases where they don’t lead to an opening. The blue
    squares are also quite far from other information, so may not give much
    progress even if they give a small opening. Cyan is slightly better than the
    blue options as it is closer to other information, so more likely to give
    good follow-up moves.
  </p>
  <p>
    In this case I went for green as it is guaranteed to give information. Green
    has [mine density]% chance of blasting (just like the other options), but
    has very low risk of losing a click to an opening.
  </p>
  <p>
    It’s possible to estimate probabilities of certain risks to help judge them.
    The below diagram shows what would be required for green to lose a click to
    an opening.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image28.png" class="base-img" />

  <p></p>
  <p>The requirement for there to be a bad opening (white) is as follows:</p>
  <p>The top mine should be in orange (½ chance)</p>
  <p>The mines touching the 4 should be in orange (⅓ chance)</p>
  <p>
    Four floating cells should be safe (1 - [mine density] chance per safe
    cell).
  </p>
  <p>
    So the chance of this is ½ * ⅓ * (1 - [mine density])^4. We can either
    manually minecount to get the mine density, or assume it is somewhere around
    1 in 5 (20.625% on expert to be precise). Long story short, it is unlikely
    for green to lose a click to an opening (around 7% chance assuming normal
    density).
  </p>
  <p>
    So that should be the end of it, right? Green is equally as likely as the
    other options to be a mine but has good follow-up and very low risk of
    losing a click to an opening.
  </p>
  <p>
    Some of you may have noticed that I haven’t mentioned green square’s twin.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image29.png" class="base-img" />

  <p></p>
  <p>
    The green square has a twin marked T above. The fact that green has a twin
    is another advantage of it that I didn’t draw much attention to before. T
    gives useful information that either improves the cyan guess or tells us to
    go somewhere else.
  </p>
  <p>
    Strictly speaking, I should’ve clicked on T before I clicked on the
    left-green square. This is because T is part of the same guess as the
    left-green square, but is less exposed than it. Whenever left-green is safe,
    T will also be safe, but T doesn’t have the risk of losing a click to an
    opening.
  </p>
  <p class="text-h5">High density strategy</p>

  <p>
    As you approach the end of the board, it is often sensible to work out what
    the remaining mine density is. The best way to play a high density endgame
    is often quite different from how you would play a low density endgame. I
    find high density strats to be one of the harder parts of NF efficiency.
    There is no exact percentage where “high density” starts - I usually start
    to consider high density strats as the density gets close to 25% and above.
  </p>
  <p>
    I’ve generated some typical 30x30 boards at different densities to give a
    rough idea of how these densities usually look. You should be able to see
    that openings start to make up much less of the board as the density
    increases. Openings are still reasonably common around the corners/edge of
    the board. I chose games close to the average 3bv for these boards, but the
    numbers given in the table will still differ from their true values.
  </p>

  <table>
    <tbody>
      <tr>
        <td><strong>20% density</strong></td>
        <td><strong>25% density</strong></td>
        <td><strong>30% density</strong></td>
      </tr>
      <tr>
        <td>
          <img src="/img/articles/nf-eff-guide/image30.png" class="base-img" />
        </td>
        <td>
          <img src="/img/articles/nf-eff-guide/image31.png" class="base-img" />
        </td>
        <td>
          <img src="/img/articles/nf-eff-guide/image32.png" class="base-img" />
        </td>
      </tr>
      <tr>
        <td>
          <strong>20%</strong>
          mines (180)
        </td>
        <td>
          <strong>25%</strong>
          mines (225)
        </td>
        <td>
          <strong>30%</strong>
          mines (270)
        </td>
      </tr>
      <tr>
        <td>
          <strong>31%</strong>
          protected squares (281)
        </td>
        <td>
          <strong>41%</strong>
          protected squares (368)
        </td>
        <td>
          <strong>49%</strong>
          protected squares (437)
        </td>
      </tr>
      <tr>
        <td>
          <strong>33%</strong>
          opening edge squares (296)
        </td>
        <td>
          <strong>25%</strong>
          opening edge squares (229)
        </td>
        <td>
          <strong>16%</strong>
          opening edge squares (148)
        </td>
      </tr>
      <tr>
        <td>
          <strong>16%</strong>
          “zero” squares (143)
        </td>
        <td>
          <strong>9%</strong>
          “zero” squares (78)
        </td>
        <td>
          <strong>5%</strong>
          “zero” squares (45)
        </td>
      </tr>
      <tr>
        <td>
          <strong>18.3</strong>
          average size of an opening (including zeros and edges)
        </td>
        <td>
          <strong>14.0</strong>
          average size of an opening (including zeros and edges)
        </td>
        <td>
          <strong>12.9</strong>
          average size of an opening (including zeros and edges)
        </td>
      </tr>
    </tbody>
  </table>

  <p>
    I will give some general tips about high density before returning to the
    review.
  </p>
  <ul>
    <li>
      You should lean towards going for squares that are known to be safe, even
      if they have some risk of being on the edge of an opening.
    </li>

    <li>
      You should still be cautious around squares that are very likely to be
      openings (such as squares on the edge of the board).
    </li>

    <li>
      You should try to pick squares that give good information. Be aware that
      playing safely often gives less information than predicting openings, and
      may need multiple risks to be taken for the same amount of progress.
    </li>

    <li>
      Always think about how a move should be followed up. Before clicking any
      square, you should know where your next click will be for each possible
      number that could be revealed.
    </li>

    <li>
      Think about how your guesses affect the remaining density. This matters
      more when there aren’t many squares/mines left. Guessing squares that
      touch many floating squares will give more knowledge about the remaining
      density. Also, playing for openings in one part of the board will make
      other parts of the board more dense on average. This is because if you get
      an opening in one part of the board, all the mines that could’ve been
      blocking that opening now must be elsewhere. The reverse is also true,
      that playing for there to
      <em>not</em>
      be openings will reduce the density elsewhere.
    </li>

    <li>
      When playing safely, you may end up leaving some squares exposed to the
      risk of losing clicks. Keep track of these squares and avoid moves that
      increase the risk of these exposed squares losing clicks. Instead try to
      play moves that work with these at risk squares. I give a strategy for how
      to leverage at-risk squares in the “virtual mines” section of this guide.
    </li>
  </ul>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image33.png" class="base-img" />

  <p></p>
  <p>
    The above example shows a common mistake when dealing with exposed squares.
    We can see that the “3” is not part of any already revealed openings and is
    also not protected by any mines, so it has potential to lose clicks to a
    future opening. It might be tempting to go for an opening prediction on
    purple, but this would be a mistake. If purple gives an opening, then it’s
    very likely that the opening will expand to also include the “3” which means
    that a click was wasted.
  </p>
  <p class="text-h5">Back to the review</p>

  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image34.png" class="base-img" />

  <p></p>
  <p>
    I’ve shown the full board above to take stock of the full situation. This
    game has a very real chance of making it to 100%. We still have the region
    in the bottom left that we have been saving. We also have a nice enclosed
    region on the right hand side. We have done a manual density count and
    determined that there are 11 floating mines left in 36 floating squares
    which works out as a very high density of 30.56%.
  </p>
  <p>
    We will focus on the right hand side next as it is the larger area (keeping
    the option open of using minecount on the left hand side).
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image35.png" class="base-img" />

  <p></p>
  <p>There are 4 moves worth considering here.</p>
  <ul>
    <li>
      Blue is the worst option as the density is very high, so it is much more
      likely to be an unnecessary risk than it is to give an opening. I’ve
      included it though as it could be a decent move at lower densities. One
      can imagine that it would be very good at enclosing the board if it gave
      an opening.
    </li>

    <li>
      Cyan has a decent chance of being an opening. The drawbacks are that it
      has a [mine density]% chance of blasting and also the possibility of
      losing a click if green is an opening.
    </li>

    <li>
      Green has the strong benefit of being a safe square to click on. It can be
      an opening itself, although it also has the risk of losing a click if cyan
      is an opening. If it does not grant us an opening, then it has good
      follow-up options since it can be “pulled” both upwards and downwards.
    </li>

    <li>
      Purple is a high-density type of move. It’s a safe square to click on,
      although it is threatened by a possible opening to its bottom-right. The
      most likely follow-up to purple is that we start exploring the squares to
      its right, which may involve taking on extra risk depending on how lucky
      we get.
    </li>
  </ul>
  <p>
    I’ll first compare cyan and green, and then I will come back to purple. Blue
    has been ruled out as it only makes sense on low density.
  </p>
  <p>
    When playing by instinct, I would typically go for cyan, which is quite a
    natural move in lower density situations where green has the big risk of
    being ruined by the 50% chance of a mine being to its bottom-right. As this
    was a high-density and high-stakes situation, I examined the options more
    closely.
  </p>
  <p>
    <span style="text-decoration: underline">Cyan</span>
  </p>
  <ul>
    <li><strong>The chance of being a mine is 0.3</strong></li>

    <li>
      <strong
        >The chance of being an opening (assuming it is safe) is 0.33</strong
      >
      <p>
        This comes from the following expression where d is density: (1 - d)^3
      </p>
    </li>

    <li>
      <strong
        >The chance of losing a click to an opening (assuming cyan is safe) is
        0.18</strong
      >
      <p>
        This comes from the below calculation (colours based on diagram below)
      </p>
      <p>
        P(loses click given cyan is safe) = P(at least one mine in orange) *
        P(yellow safe) * P(red mine)
      </p>
      <p>In terms of density this is: (1 - (1 - d)^2) * (1 - d) * 1/2</p>
      <p></p>

      <img src="/img/articles/nf-eff-guide/image36.png" class="base-img" />

      <p></p>
    </li>
  </ul>
  <p>
    <span style="text-decoration: underline">Green</span>
  </p>
  <ul>
    <li><strong>The chance of it being a mine is 0</strong></li>

    <li>
      <strong>The chance of it being an opening is 0.24</strong>
      <p>This comes from (1 - d)^2 * ½.</p>
    </li>

    <li>
      <strong>The chance of it losing a click to an opening is 0.12</strong>
      <p>This comes from the below (colours based on diagram below)</p>
      <p>
        P(green loses click) = P(yellow all safe) * P(red mine) = (1 - d)^4 * ½
      </p>
      <p></p>

      <img src="/img/articles/nf-eff-guide/image37.png" class="base-img" />

      <p></p>
    </li>
  </ul>
  <p>
    So, seeing these numbers, it should be very clear that green is better on
    all measures except opening likelihood. In fact, contrary to what the
    numbers above might suggest, green is also better when it comes to opening
    likelihood.
  </p>
  <p>
    I’ve been slightly deceptive in how I did these calculations. Whilst I
    stated that the chance of cyan being an opening is 0.33, this was
    conditional on cyan being safe. It would be better to look at the chance of
    cyan being an opening without necessarily assuming it is safe. When viewing
    it this way, the chance of cyan being an opening is P(cyan safe) * P(cyan is
    an opening given it is safe) =
    <strong>0.23</strong>
    . We had the equivalent figure of green being
    <strong>0.24</strong>
    , so green is very slightly more likely to produce an opening than cyan.
  </p>
  <p>
    So green is better than cyan in all measures. I’ll now compare green to
    purple.
  </p>
  <p>
    <span style="text-decoration: underline">Purple</span>
  </p>
  <ul>
    <li><strong>The chance of it being a mine is 0</strong></li>

    <li><strong>The chance of it being an opening is 0</strong></li>

    <li>
      <strong>The chance of it losing a click to an opening is 0.11</strong>
      <p>This comes from the diagram below</p>
      <p>P(purple loses click) = P (yellow all safe) = (1 - d)^6</p>
      <p></p>

      <img src="/img/articles/nf-eff-guide/image38.png" class="base-img" />

      <p></p>
    </li>
  </ul>
  <p>
    So based on these numbers, I consider green to be better than purple. Purple
    is slightly less likely to lose a click than green, but green more than
    makes up for this as it has a 24% chance to give an opening (and even if it
    doesn’t give an opening, it will still give great progress).
  </p>
  <p>So, we pick green and end up with the below.</p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image39.png" class="base-img" />

  <p></p>
  <p>
    I’d like to go on a bit of a tangent before returning to this situation. We
    are in a slightly precarious spot as there is a real chance we could lose
    some clicks to an opening. I’d suggest staring at it a bit and thinking
    about how you would play it.
  </p>
  <p class="text-h5">A favourite pattern</p>

  <p>
    Can you really call yourself a minesweeper player if you don’t have a
    favourite pattern?
  </p>
  <p>My favourite pattern for NF Efficiency is the below</p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image40.png" class="base-img" />

  <p></p>
  <p>
    Once you first see this pattern, you will start seeing it in lots of
    different places. The move is to go for the green square as this is either
    protected by mines (left image below) or very likely to give an opening
    (right image below).
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image41.png" class="base-img" />

  <img src="/img/articles/nf-eff-guide/image42.png" class="base-img" />

  <p></p>
  <p>
    I apologise for the slightly out of place section, I wasn’t able to resist
    not including this. This pattern serves as a good illustration that moves
    can have multiple different ideas behind them. There’s another short
    section, before I get back to the review, which I promise will be more
    relevant.
  </p>
  <p class="text-h5">Virtual mines</p>

  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image43.png" class="base-img" />

  <p></p>
  <p>
    I will show a technique that can sometimes be used when you have squares
    that are at risk of losing a click to an opening. In the above screenshot,
    we are at risk of there being an opening on the white square that would
    cause us to lose clicks on the purple squares.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image44.png" class="base-img" />

  <p></p>
  <p>
    The only way to prevent the bad opening is to have a mine in one of the
    orange squares. Assuming we are going for 100%, there absolutely must be (at
    least) one mine in these orange squares as otherwise we have lost.
  </p>
  <p>
    We can consider the different cases where the virtual mine is in the top,
    middle or bottom orange square. It should be possible to see that in all of
    these cases, the green square will be protected. So, it is safe to click the
    green square.
  </p>
  <p class="text-h5">Back to the review</p>

  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image45.png" class="base-img" />

  <p></p>
  <p>
    Where we left off was that we were in a precarious position. If the white
    square (or the square below it) is an opening, then we will lose clicks. The
    only way to prevent the white opening is to have a mine somewhere in orange
    (below diagram).
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image46.png" class="base-img" />

  <p></p>
  <p>
    Provided that we are still on track for 100%, there will be a mine in the
    orange squares and so the green squares will be protected and safe to click
    on. This is the same concept as the virtual mines discussed in the previous
    section. In the game, I clicked one of the green squares and this led to a
    surprising amount of progress.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image47.png" class="base-img" />

  <p></p>
  <p>
    We clean up the protected squares and end up in the above situation. We have
    4 floating mines in 15 floating squares (26.7% density).
  </p>
  <p>
    An obvious question to ask is - which region should we start with. Usually,
    the answer is to start with the larger region, however these regions are
    quite similar sizes.
  </p>
  <p>
    There are two more factors we can take into account when deciding which
    region to go for:
  </p>
  <ol>
    <li>
      How much benefit would the region get from having a more refined
      minecount. It can help to ask yourself questions such as: would I play the
      right region differently if I knew it had, say, 1 mine left vs 3 mines
      left. If a region would benefit significantly from knowing the minecount
      then it is better to leave it until last.
    </li>

    <li>
      How good are the guesses in this region. If a region has really good low
      risk guesses that are likely to solve the whole region, then it would
      suggest going for that region first.
    </li>
  </ol>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image48.png" class="base-img" />

  <p></p>
  <p>
    I’ve labelled 4 candidate moves above. We have green and cyan in the left
    region. We have blue and dark green in the right region. Let’s consider
    these moves with the factors discussed above in mind.
  </p>
  <p>
    As I will explain in more detail later on, the left region has a very strong
    guess with green. Minecount helps a little bit as if we were told that the
    number of mines in the left region was low (0 or 1), we would go for cyan
    instead. The left region does have a lot of information available though, so
    it is likely we can solve it without needing the extra help from minecount.
  </p>
  <p>
    The right region is quite tricky. If we guess green or blue, we may end up
    getting stuck if they do not reveal a nice number. Minecount would be very
    helpful here. Low density would tell us to go for blue and high density
    would tell us to go for green. Having a precise minecount in the right
    region could also help us in situations where our guesses don’t yield direct
    logic.
  </p>
  <p>
    With the above factors in mind, it makes sense to start in the left region
    taking the green guess, which is what I did in the game.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image49.png" class="base-img" />

  <p></p>
  <p>
    I’d like to go into a little bit more detail about why the green guess is so
    good. The idea behind green is that we are hoping that there is a mine
    preventing the opening in one of the 6 orange squares.
  </p>
  <p>
    A quick sanity check confirms that green is a low risk option. The naive
    calculation would be as follows: green loses clicks if the 6 orange squares
    are safe, and the density is 26.7%, so the chance of it losing clicks is (1
    - 0.267)^6 = 15%. This calculation is wrong. Each extra square required to
    be safe further increases the remaining density so the true chance of green
    losing clicks is only 9% (this can be worked out with combinatorics). With
    this calculation, we can see that green is much safer than taking a 26.7%
    chance on a floating square.
  </p>
  <p>
    Usually most of the risks I take are from opening predictions as they tend
    to give better progress, however it is worth considering options like green
    as long as there is a clear idea behind them. The green squares provide a
    lot of information which should help us locate where the floating mines are
    in this region. It is a good idea to mentally play out the different
    situations of where the floating mines could be and whether we would be able
    to locate them.
  </p>
  <p>
    For example, if we end up with something like the below image then we could
    click green and use the virtual mine method to locate which of the orange
    squares (hopefully) contains a mine.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image50.png" class="base-img" />

  <p></p>
  <p>
    With our green guess, we got very lucky. We were able to locate all 4 of the
    remaining mines without taking extra risk. I have marked one of the mines
    dark red as that would’ve been a very natural guess in this region
    (corresponding to cyan earlier), so it is fortunate that we left this region
    until the end and played it carefully.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image51.png" class="base-img" />

  <p></p>
  <p>
    As we have found all of the floating mines, we can then solve the right
    region with zero risk taken and complete the board.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image52.png" class="base-img" />

  <p></p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image53.png" class="base-img" />

  <p></p>
  <p>
    We are rewarded for our efforts with a shiny NF-Topaz and 4,500 shards for
    coming 2nd in the March 2024 championship (congratulations go to
    <a href="https://minesweeper.online/player/6836079">Mikan</a>
    for coming first and also earning an NF-Topaz with his much faster game
    <a href="https://minesweeper.online/game/3193873310">here</a>
    ).
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image54.png" class="base-img" />

  <img src="/img/articles/nf-eff-guide/image55.png" class="base-img" />

  <p></p>
  <p class="text-h5">Some miscellaneous tips</p>

  <p>
    I have a few tips to mention here which I couldn’t fit in any other part of
    the guide.
    <br />
    <br />
    One important skill is to be able to play the start of games fast, as that
    means that you can go through boards more quickly so that you come across
    more boards which have potential. One way to go faster is to know when to
    break away from the core strategy. For example, you can sometimes skip out
    on clearing protected squares if you know that those protected squares won’t
    give information that can change the best guess - you should just go for the
    best guess first. Also, when there are multiple similar guesses that are far
    away from each other, then unless the board looks very promising, it’s not
    always worth spending much time weighing up which is better as you’ll often
    end up having to do both guesses anyway, since information doesn’t usually
    travel very far in NF efficiency (at least for expert density).
  </p>
  <p>
    An advanced skill to learn is to know when to minecount. Sometimes it is
    even possible to make a judgement by eye, for example, if you’ve revealed
    some very large openings and don’t see many high numbers on the boards then
    it is likely that the remaining density is on the high side, which can lead
    to playing in a different way.
  </p>
  <p>
    It’s very important to mentally track which squares are at risk of being on
    the edge of an opening, as if these squares get hit by an opening then you’d
    know that you need to reset. There is a cheap trick for this, which is to
    take screenshots of at-risk squares, although I’d encourage practising
    remembering these squares instead.
  </p>
  <p>
    How do you get a feel for how doable 100% NF expert is? I first got a feel
    for this by playing expert sized boards but with a lower number of mines,
    starting with 30x16/70 and then progressing on to 30x16/80, 30x16/90 and
    finally 30x16/99 (true expert), each size taking longer than the previous. I
    also recommend a similar strategy for other categories in minesweeper such
    as when trying to improve a time PB.
  </p>
  <p class="text-h5">Conclusion</p>

  <p>
    I hope that I have succeeded in my goal of shedding some light on the more
    advanced parts of NF efficiency. In reviewing this game, I haven’t shied
    away from positions which can be really close calls, and it is often hard to
    know what the objectively best move is. If you feel that there are things I
    have got incorrect in the guide or have other feedback then feel free to let
    me know on WoM (
    <a href="https://minesweeper.online/player/733893">llama</a>
    ) or on Discord (username llama7). If you found my guide helpful, I’d
    appreciate it if you give it a ❤ on the guides page. Special thanks go to
    janitor2 for giving me some very useful feedback when I was writing this
    guide.
  </p>
  <p>
    The natural next step is to practise, so I’d like to end this guide with
    some suggestions of NF efficiency challenges to try.
  </p>
  <ul>
    <li>
      Intermediate NF 100% - one of the easiest challenges. A skilled player
      should be able to win this around 1 in 7 times. A fun challenge is to try
      to complete Int NF 100% as fast as possible. This has heavy competition
      and is good training for recognising potential openings quickly in regular
      games.
    </li>

    <li>
      Expert NF 100% - the subject of this guide. I was the first person to
      achieve this back in
      <a href="https://minesweeper.online/game/801705135">2021</a>
      . As of writing this guide, 14 other people have got it. A special mention
      goes to
      <a href="https://minesweeper.online/player/15420315">Yermak</a>
      who achieved it 3 separate times during the April 2026 championship.
    </li>

    <li>
      Hard NF 100% - the easier relative of expert. No-guess makes this a fun
      mode to play as it gives more friendly boards, and the start can be less
      frustrating due to the initial free opening. This was first achieved by
      <a href="https://minesweeper.online/player/2677763">PTTACGfans</a>
      with this
      <a href="https://minesweeper.online/game/1139262670">game</a>
      . I’ve come close with a 99% game that lost a single click at the end.
    </li>

    <li>
      Evil NF 100%. This is a considerable challenge, which I would estimate to
      be in the range of 2x-10x harder than expert NF 100%. As a no-guess game
      mode, evil brings with it some new highly interesting situations around
      using no-guess meta-reasoning. It has a slightly higher density than
      expert which can lead to a slightly different playstyle. I initially
      started this guide with the intention of motivating people to play Evil NF
      Eff, before I ended up getting it myself on
      <a href="https://minesweeper.online/game/3439056000">June 9th 2024</a>
      . I did a video review of my Evil NF 100% game
      <a href="https://www.youtube.com/watch?v=wFJEG_dzr8g">here</a>
      (small warning - it is quite long and a bit rambly).
    </li>

    <li>
      Winstreak - trying to get as many 100% NF Eff wins a row. This can be a
      nice challenge as it allows a mix of playing fast and also slow +
      thoughtfully once a streak gets going. I played this when there were
      bounties running for Beginner and Intermediate. My record for beginner is
      <a href="https://minesweeper.online/winstreak/1517772914">21</a>
      . My record for intermediate is
      <a href="https://minesweeper.online/winstreak/1611609033">6</a>
      , which is possibly one of my hardest NF Eff achievements to beat due to
      the luck required.
    </li>

    <li>
      Mastery - this is not super popular, but there has previously been a
      <a
        href="https://docs.google.com/spreadsheets/d/1TyWG9TAMAzhkmtmUrbbl2f_qfbP0xfePlGtRrpTmRr4/edit?gid=550494028#gid=550494028"
      >
        competition
      </a>
      for winning the most 100% NF Eff intermediate games out of 100. My record
      is
      <a href="https://minesweeper.online/mastery/4538607293">21</a>
      (shows as 22 because one game was &lt; 100%). There is a bounty by
      <a href="https://minesweeper.online/player/9412864">SandCrawl</a>
      for getting 22 mastery, which I think has been a bit overlooked and could
      be a good but achievable challenge for anyone with a solid understanding
      of NF efficiency.
    </li>

    <li>
      Arena. Specifically, the challenge here is to beat the efficiency arenas,
      which require beating a set number of games with 100% efficiency. I
      consider this to be one of the frontiers of NF efficiency. It requires a
      high degree of skill in being able to quickly find good guesses at a range
      of different densities. It also requires the ability to play very fast
      with a very low misclick rate. As of writing, there are outstanding
      bounties for completing L6 and L8 efficiency arenas without flags (bounty
      spreadsheet
      <a
        href="https://docs.google.com/spreadsheets/d/1n0YfTQMpTSjUb6KD_ABr8RkUeNEzooAVSFu4w20zQKI/edit"
        >here</a
      >
      ). The current best is L5 which was first achieved by
      <a href="https://minesweeper.online/player/6836079">Mikan</a>
      with this
      <a href="https://minesweeper.online/arena/3210932">arena</a>
      . My advice for NF Eff arena is to familiarise yourself with the different
      board sizes/densities that can occur and learn when to skip a bad board.
    </li>
  </ul>
  <p class="text-h5">Appendix: Preparation guess analysis</p>

  <p>
    Here I go a bit deeper into the theory behind preparation guesses at
    different densities. I’ve included this in the appendix as it’s not
    necessary for understanding the guide. It’s quite a maths heavy section, and
    there is a decent amount of uncertainty in my conclusion due to the
    difficulty of comparing different types of progress (e.g. surviving vs
    finding openings). There may still be some value in seeing how I approach
    this. And I would love to hear if anyone has new ideas on how to weigh up
    the various strategies.
  </p>
  <p>
    As a reminder, a preparation guess is when you take an additional risk with
    protected squares in order to improve a potential opening prediction guess.
    We’ll revisit the example from earlier.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image16.png" class="base-img" />

  <p></p>
  <p>
    Here green is an opening prediction, and cyan is a preparation guess with a
    [mine density]% chance of blasting. We are considering whether it is better
    to go for the green guess or the cyan guess, and how this decision is
    affected by the mine density.
  </p>
  <p>
    I’ll break down these guesses by considering the initial risks that apply to
    each, and also what the chance of getting an opening is from each. There is
    a third factor which I consider to be very important, which is that guesses
    give progress even if they do not immediately lead to openings. This
    “non-opening” progress may be realised in the short term, if perhaps some
    information gained leads to better opening predictions a few moves later.
    “Non-opening” progress may also be realised much later if information gained
    only becomes useful when a lot more of the board is revealed. Either way,
    this type of progress is very hard to quantify, so it’s not something that I
    will go into much with my analysis, though it is something that should be
    kept in mind when drawing conclusions.
  </p>
  <p>
    <span style="text-decoration: underline">Comparison of initial risk</span>
  </p>
  <p>
    When comparing risks, keep in mind that when going for 100%, losing a click
    and clicking a mine should be equally treated as losses. The below table
    shows the main risks that apply to green but not cyan and vice versa
  </p>

  <table>
    <tbody>
      <tr>
        <td><strong>Green Guess</strong></td>
        <td><strong>Cyan Guess</strong></td>
      </tr>
      <tr>
        <td>
          <img src="/img/articles/nf-eff-guide/image56.png" class="base-img" />
        </td>
        <td>
          <img src="/img/articles/nf-eff-guide/image57.png" class="base-img" />
        </td>
      </tr>
      <tr>
        <td>
          Green will lose a click if we have both of the below conditions
          <ol>
            <li>There is at least 1 mine in orange</li>

            <li>All yellow squares are safe</li>
          </ol>
        </td>
        <td>Cyan will blast if red is a mine</td>
      </tr>
      <tr>
        <td></td>
        <td>
          <img src="/img/articles/nf-eff-guide/image58.png" class="base-img" />
        </td>
      </tr>
      <tr>
        <td></td>
        <td>
          If cyan reveals a 2 (or 3) then a backup guess will be required such
          as purple, which has similar risks to the green guess (may lose a
          click if there is a mine in orange and all yellow are safe)
        </td>
      </tr>
    </tbody>
  </table>

  <p>
    Take a moment to think about which of these initial risks is more likely to
    happen and how this might be influenced by board density.
  </p>
  <p>
    <span style="text-decoration: underline"
      >Comparison of opening likelihood</span
    >
  </p>
  <p>
    Similarly, the table below shows some opening predictions that apply to
    green or cyan.
  </p>

  <table>
    <tbody>
      <tr>
        <td><strong>Green Guess</strong></td>
        <td><strong>Cyan Guess</strong></td>
      </tr>
      <tr>
        <td>
          <img src="/img/articles/nf-eff-guide/image59.png" class="base-img" />
        </td>
        <td>
          <img src="/img/articles/nf-eff-guide/image60.png" class="base-img" />
        </td>
      </tr>
      <tr>
        <td>White can be an opening if all 5 yellow squares are safe</td>
        <td>
          If cyan reveals a 1 then white can be an opening if all 3 yellow
          squares are safe
        </td>
      </tr>
      <tr>
        <td></td>
        <td>
          <img src="/img/articles/nf-eff-guide/image61.png" class="base-img" />
        </td>
      </tr>
      <tr>
        <td></td>
        <td>
          If cyan reveals a 2 (or 3) then a backup guess will be required which
          has a chance of producing an opening
        </td>
      </tr>
    </tbody>
  </table>

  <p>
    Now that we have some idea of which factors affect each guess, it’s worth
    running some numbers to see how much these matter at different densities.
    I’ve included the image of where the guesses are again for ease of
    reference.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image16.png" class="base-img" />

  <p></p>
  <p>
    The formulas below are for the initial risk of each guess (either blasting
    or losing a click). I’m using the letter d to represent density.
  </p>
  <p>
    Risk of green = chance green is a mine
    <em>or</em>
    it is safe but loses a click to an opening
  </p>
  <p>
    Risk of green = P(green is mine) + P(green is safe) * P(green touches
    opening)
  </p>
  <p>Risk of green = d + (1 - d) * (1 - (1 - d)^2) * (1 - d)^5</p>
  <p>
    Risk of cyan = chance cyan is a mine
    <em>or</em>
    it is safe but the next move blasts/touches opening (the next move is either
    green or going for a backup guess)
  </p>
  <p>
    Risk of cyan = P(cyan is mine) + P(cyan is safe) * [P(Grey is empty) *
    P(Green is mine) + P(Grey not empty) * P(square to left of green is mine or
    loses click to opening)]
  </p>
  <p>
    Risk of cyan = d + (1 - d) * [ (1 - d)^2 * d + (1 - (1 - d)^2) * { d + (1 -
    d) * (1 - (1 - d)^2) * (1 - d)^5 } ]
  </p>
  <p>
    I’ve plotted the initial risks below. The risk for the green guess is shown
    by the green line, and the risk of the cyan guess is shown by the blue line.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image62.png" class="base-img" />

  <p></p>
  <p style="text-align: center">
    <a href="https://www.desmos.com/calculator/dl0yjsafmf"
      >initial risk graph</a
    >
  </p>
  <p>
    We can see that the lines cross around 9% density, and after that the green
    guess has much less initial risk. We also note that around 20% density, the
    preparation guess (cyan) is almost 10% riskier than the border guess
    (green). So initial risk favours the preparation guess on very low density
    and the border guess on higher density.
  </p>
  <p>Lets now do the same for the chance of each guess giving an opening</p>
  <p>Chance of green opening = P(green is safe) * P(green is opening)</p>
  <p>Chance of green opening = (1 - d) * (1 - d)^5</p>
  <p>
    Chance of cyan opening = chance cyan is safe and we get an opening after
    (either from green or from a backup guess depending on what cyan reveals)
  </p>
  <p>
    Chance of cyan opening = P(cyan is safe) * [P(Grey is empty) * P(Green is
    opening) + P(Grey not empty) * P(square to left of green is opening)]
  </p>
  <p>
    Chance of cyan opening = (1 - d) * [(1 - d)^2 * (1 - d)^4 + (1 - (1 - d)^2)
    * (1 - d)^6]
  </p>
  <p>
    I’ve plotted these below. The chance that green is an opening is given by
    the green line and the chance for cyan is shown by the blue line.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image63.png" class="base-img" />

  <p></p>
  <p style="text-align: center">
    <a href="https://www.desmos.com/calculator/mapherwcrl"
      >opening chance graph</a
    >
  </p>
  <p>
    We can see that the cyan guess tends to have around 2-3 percentage points
    higher chance of giving an opening than the green guess. This is what makes
    it so tricky to compare the two moves. For densities we are interested in
    (10% - 25%), the preparation guess has more initial risk, but a higher
    chance of producing an opening.
  </p>
  <p>
    So a key question is how to weigh this up. How much is it worth taking extra
    risk (blasting/losing a click) for a higher chance of an opening. We do know
    that openings are incredibly valuable in NF Eff, as they are one of the best
    ways to make progress on a board.
  </p>
  <p>
    One approach could be to look at the ratio between opening chance and risk
    taken. That is, for every 1% risk taken, how much chance of an opening do we
    get out of that. All we are doing here is dividing the chance of an opening
    by the initial risk of the guess. We should keep in mind that this approach
    isn’t taking into account other forms of progress, but we can consider that
    later. In the next graph, I look at this ratio, again using a green line for
    the green guess and a blue line for the cyan guess.
  </p>
  <p style="text-align: center"></p>

  <img src="/img/articles/nf-eff-guide/image64.png" class="base-img" />

  <p></p>
  <p style="text-align: center">
    <a href="https://www.desmos.com/calculator/eagwjtum0o"
      >opening/risk ratio graph</a
    >
  </p>
  <p>
    With this new graph, we can see that the crossover point has shifted upwards
    to 11% (recall that when we were just looking at initial risk, the crossover
    was at 9%). So if we purely consider the opening/risk ratio it would suggest
    taking the border guess (green) for densities above 11% and going with the
    preparation guess (cyan) for densities below 11%.
  </p>
  <p>
    In reality, the crossover point will be higher. This is because the cyan
    guess gives better progress than green outside of what we have already
    considered with trivial openings. As an example, we could end up with
    something like the below on the cyan guess.
  </p>
  <p style="text-align: center">
    <br />
    <br />
  </p>

  <img src="/img/articles/nf-eff-guide/image65.png" class="base-img" />

  <img src="/img/articles/nf-eff-guide/image66.png" class="base-img" />

  <p></p>
  <p>
    Whilst cases like this aren’t accounted for in our formulas, it is clear
    that if we get something like this it would lead to further progress as we
    have some nice options for additional opening predictions. It’s very hard to
    take into account all of the different ways that the cyan guess can give
    extra “non-opening” progress.
  </p>
  <p>
    In the end it comes down to a judgement call for how much to value the extra
    progress from cyan. I would encourage you to think about how the information
    from the cyan square could help out in possible games, I won’t go into this
    too much myself for the sake of brevity.
  </p>
  <p>
    I’ll give my judgement on this, although it’s very subjective and
    unrigorous. I’ll assume the board density is 15% for reasons that will
    become clear. On 15% density, we survive the initial risk of the cyan guess
    around 70% of the time which is split between 40% for getting an opening and
    for 30% for getting no opening. This is admittedly very handwavy, but my
    judgement is that the extra unaccounted for information given by cyan is
    probably equivalent to 4% chance of getting an opening. If we were to edit
    our opening/risk ratio graph to boost cyan’s opening chance by 4% then we’d
    see the lines cross each other around 15%. This 4% figure is basically
    pulled from the air though, I have considered lots of different ways that
    the cyan guess can give progress to reach this figure, however I expect that
    everyone will judge this differently. Given that boosting cyan’s opening
    chance in this way changes the crossing point to 15%, then I would claim
    that you should go for cyan below 15% and green above 15%. However, the
    exact crossing point is very sensitive to how much cyan’s opening chance
    gets boosted by, for example if we instead boost cyan’s opening chance by 6%
    then the crossing point becomes 20% density.
  </p>
  <p>
    There isn’t any strong takeaway from this section, and indeed there is a lot
    of uncertainty in my conclusions. I’ve mainly provided this to give some
    insight into how I view preparation guesses. It’s worth keeping in mind that
    preparation guesses should always be treated with caution, there are no hard
    rules, and every situation is different.
  </p>
</template>

<style scoped>
.base-img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

.img-100 {
  width: 100px;
}
.img-200 {
  width: 200px;
}
.img-300 {
  width: 300px;
}
.img-400 {
  width: 400px;
}
.img-500 {
  width: 500px;
}
.img-600 {
  width: 600px;
}
.img-700 {
  width: 700px;
}
.img-800 {
  width: 800px;
}

.img-todo {
  border: 4px solid red;
}
</style>

<script setup>
defineOptions({
  name: "NfEffGuideArticle",
});
</script>
