---
title: "Hetzner: Installing Linux"
date: 2023-09-02
tags: [unix/linux, cli, hetzner]
---
Some years ago, I rented a dedicated server from Hetzner. In this piece I will outline Hetzner's simplified process for installing Linux on this server

## Installing and configuring

After going through the payment process I received an email containing the following information:

```
IPv4 Address:	78.46.174.158
IPv6 Address:	2a01:4f8:190:539a::2
Username:	root
Password:	b2fdbCW4Msfkki
Host key:	hHm0rbOZpc0dfrujJrs1Ry3nnc2oaKSto05kFmzj4h8 (DSA 1024)
qSt2t9EVp7z5ehrJMiSuSHKQ5/1rXL6wzy/I3Su9k8c (ECDSA 256)
qdLfInM7MxtFxr5KNQe8s9qywkVdrvsLUWGzbb0rQQ8 (ED25519 256)
CbqGZzPfRnIXE4o8ErsN+2Q4PXSIu9TGMOubpxf66rA (RSA 3072)
```
With this information, we can now log into the server. Using either Putty or a terminal of some sorts, we log into the server with the command: 
```bash
$ ssh root@78.46.174.158
```
 It will prompt for the password, so we can copy that in.

After we do so, we're greeted by Hetzner's Rescue System

<figure>
<img src="/hetzner-installing-linux/rescue.png" alt="Hetzner rescue system">
<figcaption>Hetzner's rescue system when logging into the box with ssh</figcaption>
</figure>

It immediately shows a summary of the system's specs, so the storage, cpu, memory.

From here on, we'll start up Hetzner's tool for installing our OS. We do this by running the installimage binary:
```bash
root@rescue ~ # installimage
```
Then we are presented a menu in which we're given the option to have our preferred distribution installed. Its also possible to provide your own image, but I've decided to go with Archlinux:
<figure>
<img src="/hetzner-installing-linux/installimage_menu.png" alt="Installimage menu">
<figcaption>The menu for choosing your distribution</figcaption>
</figure>
After selecting Archlinux and proceeding, an <abbr title="Midnight Commander's included editor">mcedit</abbr> is launched with the configuration file.
The configuration file serves the purpose of further configuring the server according to our wishes. There are a few options like setting up LVM for your storage, changing the bootloader, etc... In this case we will only make the changes outlined below.

We'll be setting up RAID-0. The RAID settings are:
```bash
SWRAID 1
SWRAIDLEVEL 1
```
The first line means RAID is already enabled by default, so we won't have to modify this line. We will modify the second line to achieve RAID-0
```
SWRAID 1
SWRAIDLEVEL 0
```
Next, we'll set up the partitioning by applying the following changes:
```
PART swap swap 16G
PART /boot ext3 512M
PART / ext4 1024G
PART /home ext4 all
```
to
```
PART swap swap 8G
PART /boot ext3 1G
PART / ext4 all
```
In this change I have set up a swapfile of 8g, allocated 1GB to the <abbr title="Filesystem">ext3</abbr> boot partition and allocated the rest of the space to the root filesystem at `/`. Also, no seperate partition for the home folder.

We'll also want to change the system's hostname:
```
HOSTNAME yourhostname
```
After we're done, we may continue by hitting <kbd>F10</kbd> and choosing `Yes` to save the configuration.
We'll be greeted by a warning stating that the data on the drives will be deleted, which is to be expected so we, again, continue by choosing `Yes`

Now the script will set up the system according to the previously selected distribution and configuration we edited.

```
Hetzner Online GmbH - installimage
 
 Your server will be installed now, this will take some minutes
            You can abort at any time with CTRL+C ...
 
        :  Reading configuration                           done
        :  Loading image file variables                    done
        :  Loading centos specific functions               done
  1/16  :  Deleting partitions                             done
  2/16  :  Test partition size                             done
  3/16  :  Creating partitions and /etc/fstab              done
  4/16  :  Creating software RAID level 0                  done
  5/16  :  Formatting partitions
        :    formatting /dev/md/0 with swap                done
        :    formatting /dev/md/1 with ext3                done
        :    formatting /dev/md/2 with ext4                done
  6/16  :  Mounting partitions                             done
  7/16  :  Sync time via ntp                               done
        :  Importing public key for image validation       done
  8/16  :  Validating image before starting extraction     done
  9/16  :  Extracting image (local)                        done
 10/16  :  Setting up network config                       done
 11/16  :  Executing additional commands
        :    Setting hostname                              done
        :    Generating new SSH keys                       done
        :    Generating mdadm config                       done
        :    Generating ramdisk                            done
        :    Generating ntp config                         done
 12/16  :  Setting up miscellaneous files                  done
 13/16  :  Configuring authentication
        :    Setting root password                         done
        :    Enabling SSH root login with password         done
 14/16  :  Installing bootloader grub                      done
 15/16  :  Running some centos specific functions          done
 16/16  :  Clearing log files                              done
 
                 INSTALLATION COMPLETE
  You can now reboot and log in to your new system with the
same credentials that you used to log into the rescue system.
```
Now we reboot the server and log into it with the same credentials.
Since Hetzner's network is set up with DHCP, theres no need for configuring the connection or whatsoever.

## Making `/tmp` persistent
Logging in to the server, we'll want to verify the drives have been set up correctly.

```
[root@Archlinux ~]# df -h
Filesystem      Size  Used Avail Use% Mounted on
dev              16G     0   16G   0% /dev
run              16G  844K   16G   1% /run
/dev/md2        7.2T  2.3G  6.9T   1% /
tmpfs            16G     0   16G   0% /dev/shm
/dev/md0        2.0G   84M  1.8G   5% /boot
tmpfs           3.2G     0  3.2G   0% /run/user/1000
tmpfs			 16G	 0	 16G   0% /tmp
```

```
[root@Archlinux .config]$ lsblk
NAME    MAJ:MIN RM  SIZE RO TYPE  MOUNTPOINTS
sda       8:0    0  3.6T  0 disk
├─sda1    8:1    0    2G  0 part
│ └─md0   9:0    0    2G  0 raid1 /boot
├─sda2    8:2    0    8G  0 part
│ └─md1   9:1    0   16G  0 raid0 [SWAP]
├─sda3    8:3    0  3.6T  0 part
│ └─md2   9:2    0  7.3T  0 raid0 /
└─sda4    8:4    0    1M  0 part
sdb       8:16   0  3.6T  0 disk
├─sdb1    8:17   0    2G  0 part
│ └─md0   9:0    0    2G  0 raid1 /boot
├─sdb2    8:18   0    8G  0 part
│ └─md1   9:1    0   16G  0 raid0 [SWAP]
├─sdb3    8:19   0  3.6T  0 part
│ └─md2   9:2    0  7.3T  0 raid0 /
└─sdb4    8:20   0    1M  0 part
```
It's been set up like we've intended it to, the only change I want to make in this case is the way `/tmp` is mounted. Currently, it's mounted as <abbr title="Temporary File System">tmpfs</abbr> which stores its data in memory. This means all files will vanish after every reboot, and I prefer to prevent this from happening. So, to avoid this, we'll have to make it persistent and I will achieve this by making `/tmp` part of the root filesystem.
```bash
$ systemctl mask tmp.mount
$ reboot
```
Now to verify it has been masked:
```
[root@Archlinux ~]# systemctl status tmp.mount
○ tmp.mount
     Loaded: masked (Reason: Unit tmp.mount is masked.)
     Active: inactive (dead)
```
And we can see `/tmp` has not been initialized with `tmpfs`:
```
[root@ArchBoX ~]# df -h
Filesystem      Size  Used Avail Use% Mounted on
dev              16G     0   16G   0% /dev
run              16G  844K   16G   1% /run
/dev/md2        7.2T  2.3G  6.9T   1% /
tmpfs            16G     0   16G   0% /dev/shm
/dev/md0        2.0G   84M  1.8G   5% /boot
tmpfs           3.2G     0  3.2G   0% /run/user/1000
```
## Setting up the user account and privileges
Now, it's time to install sudo and set up my user account and grant sudo privileges.
```bash
$ useradd -m -S /bin/bash uxodb
$ pacman -Syu sudo
```
For sudo priviliges we'll have to edit <a href="https://www.sudo.ws/docs/man/1.8.15/sudoers.man/" target="_blank" rel="noopener">`/etc/sudoers`</a>. Instead of doing this, we will use the drop-in functionality by creating a new file in `/etc/sudoers.d/` with our configuration. I would recommend to do it this way, as for example, changes made to files in this folder remain in place when you upgrade the system. Also if you have many users, I imagine it will be easier to manage.
```bash
$ echo "uxodb ALL=(ALL:ALL) NOPASSWD: ALL" > /etc/sudoers.d/uxodb
```
You might not want to use this setting yourself, as it may be an insecure way of granting sudo privileges. This way, you'll never be prompted for a password when using sudo. Use this configuration at your own discretion.

And finally to set a password for this account:
```bash
$ passwd uxodb
```
You will be prompted for a password twice.
```
New password:
Retype new password:
passwd: password updated successfully
```
The user account is now ready and we may proceed on creating our SSH keys.

## Creating SSH keys for authentication

When configuring a (new) server I always make sure to disable root logins and password authentication for <abbr title="Secure Shell">SSH</abbr>. I will outline below how we do this.

First, we will need to create an SSH key pair which will allow us to log in without password by using the key. We will use the `ssh-keygen` utility, it should be included with the standard OpenSSH suite of tools.
When running ssh-keygen, it will by default create a 3072 bit RSA key pair. In this case, we will go for a 4096 bit key pair.

Also note that I will **not** be running this on the server we're configuring, but on my <abbr title="Windows Subsystem for Linux">WSL</abbr> shell.

```bash
$ ssh-keygen -t rsa -b 4096
```
We are prompted for a few things, and it'll look like this:

```
Generating public/private rsa key pair.
Enter file in which to save the key (/home/WSLuser/.ssh/id_rsa):
Created directory '/home/WSLuser/.ssh'.
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /home/WSLuser/.ssh/id_rsa
Your public key has been saved in /home/WSLuser/.ssh/id_rsa.pub
The key fingerprint is:
SHA256:413Jnx/kMbkg+RdfplPH6kpd4xOCm7Bx6+FlRtx/7LI uxodb@Archlinux
The key's randomart image is:
+---[RSA 4096]----+
|                 |
|                 |
|                 |
|           .+....|
|        So =+= XB|
|       . o=.Bo*O%|
|        ...=.=BB=|
|          o.=.o++|
|           o..Eoo|
+----[SHA256]-----+
```
As you can see, we're prompted to enter a filename. If you want, you can simply press <kbd>Enter</kbd> and it will automatically use the default filename indicated within the round brackets. Following that, you will be prompted to enter a passphrase for securing the key, but this also is optional and may be skipped by pressing <kbd>Enter</kbd>, again. If you decide to use a passphrase, you will be required to provide it each time you use this key.

Before we can use the private key to authenticate to the remote host, the public key needs to be copied to the `authorized_keys` file located in `~/.ssh` on the remote host. The easiest way to do this is to make use of the `ssh-copy-id` utility. It will scan our account for the public key `id_rsa.pub` and copy it over to the remote host.

```bash
$ ssh-copy-id uxodb@Archlinux
```
It will prompt for the user's password, we use the one we've set earlier.
```
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/home/WSLuser/.ssh/id_rsa.pub"
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
uxodb@Archlinux's password:

Number of key(s) added: 1

Now try logging into the machine, with:   "ssh 'uxodb@Archlinux'"
and check to make sure that only the key(s) you wanted were added.
```
Now we can try and log into the remote host without using a password and look at the `authorized_keys` file. It should include our public key.
```bash
$ ssh uxodb@Archlinux
$ cat ~/.ssh/authorized_keys
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDP98LIP1wnXmgQzpD2cgRnj+yCg+z8SODBFVuP0/1T9z2zD+uUsNAgOBBhO+CbRco9q5let/UijfGuKaOPWHPwGGKKcQd4SBlzPIsX+VSX9RMy5ujKyLKPFVods7OLJ9rKHZPZAzVjArfCcpbLV/JOFn3XuE3ciaHZ2DSlBi3GdtdLkwwdpqtjzfqZyAB2opkfOEU1ufGZO6oX6xvsy+9NzsQ0usIPke7hWSOITellx4Cci0sUmlTkJVdb+1TYEoPY8dMv3/fKsH6F6+3kaQ+EfhEhQwiYaHxwN2Ul4hceCzkgyENQbMN4hllh/hu8YmigIOJ2qPfpNRJOrM5fFxPve2K0zr9ElRgAndJ+P57zl9vRtIdzjudM4csWwohmDCx8nR+XcwsvvXtUMGuFXzXOJ7EAhlO/6oIuCQ2qb/syB1ZhOzt8xecok51GQPL9JrVpARkbbBr6JTplnEYjlyUNipTIlWQb5Lk0mbq0bREkSJNTsy20b6Pom+Ay2ZVrRRH1o6MMy+GA9/RQJvvEjzkHA7dTMUXamwbO10FBRNneD3QTWZgaXsMLw58DJg9/gFN05UPLCxXtRmUuLQmL+3Q/BxDmMwnJIjeAGZdBAJicb+LK+LyyzDWTqYpfvr+uE1YbMKl5aTXZ8oXEIpNl2y0lFEQWChiu6sX0WcWl+ofpaw== WSLuser@DESKTOP-81ODF2L
```
Looks like `ssh-copy-id` has done its job.
If you have multiple keys, and for example multiple hosts you may log in to, it's also possible to specify the key you want to use to authenticate. You can achieve this by using the `-i` option with the `ssh` command, so for example:
```bash
$ ssh -i /home/WSLuser/.ssh/id_rsa uxodb@Archlinux
```
That's it. We can now authenticate to the server with our key and without using a password. Next we will finish configuring SSH.

## Further configuring of SSH

So, earlier we have generated the SSH keys and set them up for authenticating without a password. We have also granted the user account root privileges by editing `sudoers`. Next, what we'll want to do is disable password authentication and disable logging in to the server with root. We will achieve this by modifying the <a href="https://linux.die.net/man/5/sshd_config" target="_blank" rel="noopener">configuration</a> of <abbr title="OpenSSH Daemon">sshd</abbr>.

To modify the configuration we can use any editor like vim or nano. The location of this file is usually `/etc/ssh/sshd_config`.
```bash
$ sudo nano /etc/ssh/sshd_config
```
Most of the contents, if not all, is usually commented out with the defaults in place. We'll need to look for two options called `PermitRootLogin` and `PasswordAuthentication`. When you find them, it'll probably look like this:
```
#PermitRootLogin prohibit-password
#PasswordAuthentication yes
```
We will uncomment these lines and change both to `no`.
```
PermitRootLogin no
PasswordAuthentication yes
```
After saving the file, the settings still won't be in effect. To apply these settings we have to actually restart sshd.
```bash
$ sudo systemctl restart sshd.service
```
And to see if it has been started up correctly:
```bash
$ sudo systemctl status sshd.service
● sshd.service - OpenSSH Daemon
     Loaded: loaded (/usr/lib/systemd/system/sshd.service; enabled; preset: disabled)
     Active: active (running) since Wed 2023-07-26 15:49:14 CEST; 1 month 9 days ago
   Main PID: 463 (sshd)
      Tasks: 1 (limit: 76801)
     Memory: 10.9M
        CPU: 1h 8min 29.694s
     CGroup: /system.slice/sshd.service
             └─463 "sshd: /usr/bin/sshd -D [listener] 0 of 10-100 startups"
```

All looks fine. Now if you try to authenticate to your server as root or without password, it should respond with:
```
uxodb@Archlinux: Permission denied (publickey).
```
Making it impossible to log in as root, or without a password.
<hr>

That's it. This is how I've installed and configured (Arch)Linux on a Hetzner server I once rented. It's become somewhat of a long post, but I hope you've enjoyed the read.
