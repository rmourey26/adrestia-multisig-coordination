{ stdenv
, nix-inclusive
, nodejs
, nodePackages
, runtimeShell
, sources
, yarn
}:

let
  packageJSON = builtins.fromJSON (builtins.readFile ../package.json);
  srcDir = ( "/." );

  src = stdenv.mkDerivation {
    pname = "${packageJSON.name}-src";
    version = packageJSON.version;
    buildInputs = [ yarn nodejs ];
    src = ( ./.. + srcDir);
    buildCommand = ''
      echo "node version: $(node --version)"
      echo "yarn version: $(yarn --version)"
      echo "yarn interpreter: $(head -n1 `type -p yarn`)"
      mkdir -p $out
      cp -r $src/. $out/
      cd $out
      chmod -R u+w .
      yarn --offline --frozen-lockfile --non-interactive
    '';
  };

in stdenv.mkDerivation rec {
  name = "${pname}-${version}";
  pname = packageJSON.name;
  version = packageJSON.version;
  inherit src;
  buildInputs = [ nodejs yarn ];
  buildCommand = ''
    mkdir -p $out
    cp -r $src/. $out/
    chmod -R u+w $out
    patchShebangs $out

    cd $out

    yarn build
    find . -name node_modules -type d -print0 | xargs -0 rm -rf
    yarn --production --offline --frozen-lockfile --non-interactive

    mkdir -p $out/bin
    cat <<EOF > $out/bin/${packageJSON.name}
    #!${runtimeShell}
    exec ${nodejs}/bin/node $out/dist/src/server/index.js
    EOF
    chmod +x $out/bin/${packageJSON.name}
  '';
  passthru = { inherit nodejs yarn src; };
}
